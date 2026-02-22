import { prisma } from '@database/client.js';
import { redis, getCache, setCache } from '@database/redis.js';
import { logger } from '@shared/logger.js';
import { levelingConfig } from '@shared/config/yamlLoader.js';
import { GuildMember } from 'discord.js';

export class LevelService {
  /**
   * Verifica se a mensagem é spam (caracteres repetidos ou muito curta)
   */
  private static isSpamMessage(content: string): boolean {
    // Ignorar mensagens com 5 caracteres ou menos
    if (content.trim().length <= 5) return true;

    // Detectar caracteres repetidos (>= 70% do conteúdo é o mesmo char)
    const cleaned = content.trim().toLowerCase().replace(/\s/g, '');
    if (cleaned.length === 0) return true;

    const charCounts = new Map<string, number>();
    for (const char of cleaned) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    const maxCount = Math.max(...charCounts.values());
    if (maxCount / cleaned.length >= 0.7) return true;

    return false;
  }

  static async addExperience(member: GuildMember, channelId: string, messageContent?: string) {
    const { xp_settings } = levelingConfig;
    const userId = member.id;
    const username = member.user.username;

    // 1. Verificar canais permitidos/ignorados
    if (xp_settings.allowed_channels?.length > 0 && !xp_settings.allowed_channels.includes(channelId)) return null;
    if (xp_settings.ignored_channels?.includes(channelId)) return null;

    // Anti-spam: verificar conteúdo da mensagem
    if (messageContent && this.isSpamMessage(messageContent)) return null;

    const cacheKey = `xp_cooldown:${userId}`;
    const onCooldown = await redis.get(cacheKey);
    if (onCooldown) return null;

    let xpToGain = Math.floor(Math.random() * (xp_settings.max_xp - xp_settings.min_xp + 1)) + xp_settings.min_xp;

    // --- Aplicar Multiplicadores de Leveling 2.0 ---

    // 1. Multiplicador de Canal
    if (xp_settings.multipliers?.channels && xp_settings.multipliers.channels[channelId]) {
      xpToGain *= xp_settings.multipliers.channels[channelId];
    }

    // 2. Multiplicador de Cargo
    if (xp_settings.multipliers?.roles) {
      let highestRoleMultiplier = 1;
      for (const [roleId, multiplier] of Object.entries(xp_settings.multipliers.roles)) {
        if (member.roles.cache.has(roleId)) {
          if (multiplier > highestRoleMultiplier) highestRoleMultiplier = multiplier;
        }
      }
      xpToGain *= highestRoleMultiplier;
    }

    // --- Aplicar Multiplicadores de Eventos (Legado) ---
    try {
      const { EventService, EventType } = await import('./eventService.js');
      const eventConfig = EventService.getConfig();

      if (EventService.isEventActive(EventType.DOUBLE_XP)) {
        xpToGain *= eventConfig.fixed_events.double_xp_weekend.multiplier;
      }

      if (EventService.isEventActive(EventType.HOT_ZONE, channelId)) {
        xpToGain *= eventConfig.random_events.hot_zone.xp_multiplier;
      }
    } catch (e) {
      // Ignora se o EventService falhar ou não existir
    }

    xpToGain = Math.floor(xpToGain);

    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { username },
        create: { id: userId, username }
      });

      const levelData = await prisma.level.upsert({
        where: { userId },
        update: {
          xp: { increment: xpToGain },
          weeklyXp: { increment: xpToGain },
          weeklyMessages: { increment: 1 },
          lastMessage: new Date()
        },
        create: {
          userId,
          xp: xpToGain,
          weeklyXp: xpToGain,
          weeklyMessages: 1,
          level: 0
        }
      });

      const nextLevel = levelData.level + 1;
      const xpNeeded = this.calculateXpForLevel(nextLevel);

      if (levelData.xp >= xpNeeded) {
        const updatedLevel = await prisma.level.update({
          where: { userId },
          data: { level: { increment: 1 } }
        });

        // Invalida cache de rank para este usuário
        await redis.del(`rank:${userId}`).catch(() => { });

        // --- Verificar Recompensas de Cargo ---
        const rewards = await this.checkLevelRewards(member, updatedLevel.level);

        await redis.set(cacheKey, '1', 'EX', xp_settings.cooldown);
        return { leveledUp: true, newLevel: updatedLevel.level, rewards };
      }

      await redis.set(cacheKey, '1', 'EX', xp_settings.cooldown);
      return { leveledUp: false };
    } catch (error) {
      logger.error(`Erro ao adicionar XP para ${userId}:`, error);
      return null;
    }
  }

  static async checkLevelRewards(member: GuildMember, level: number) {
    const { level_rewards } = levelingConfig;
    if (!level_rewards?.roles) return [];

    const rolesToAdd: string[] = [];

    // Adicionar cargos do nível atual e anteriores (garantir que não perdeu nenhum)
    for (const [lvlStr, roleId] of Object.entries(level_rewards.roles)) {
      const lvl = parseInt(lvlStr);
      if (level >= lvl) {
        if (!member.roles.cache.has(roleId)) {
          try {
            await member.roles.add(roleId);
            rolesToAdd.push(roleId);
          } catch (e) {
            logger.error(`Erro ao adicionar cargo de recompensa ${roleId} para ${member.id}:`, e);
          }
        }
      }
    }

    return rolesToAdd;
  }

  static calculateXpForLevel(level: number): number {
    // Formula: 100 + (level^2.2 × 15) + (level × 100)
    return Math.floor(100 + (Math.pow(level, 2.2) * 15) + (level * 100));
  }

  static async getRank(userId: string) {
    const cacheKey = `rank:${userId}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const levelData = await prisma.level.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!levelData) return null;

    const allRanks = await prisma.level.findMany({
      orderBy: { xp: 'desc' },
      select: { userId: true }
    });

    const rankPosition = allRanks.findIndex((r: { userId: string }) => r.userId === userId) + 1;
    const result = { ...levelData, rankPosition, xpNeeded: this.calculateXpForLevel(levelData.level + 1) };

    await setCache(cacheKey, result, 300);
    return result;
  }

  /**
   * Limpa todos os caches de rank (útil quando a fórmula muda)
   */
  static async flushRankCache() {
    const keys = await redis.keys('rank:*');
    if (keys.length > 0) {
      await redis.del(keys).catch(() => { });
      logger.info(`[Level] Cache de rank limpo (${keys.length} chaves)`);
    }
  }
}
