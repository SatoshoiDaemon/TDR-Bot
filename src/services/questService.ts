import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { questConfig } from '@shared/config/yamlLoader.js';
import { GuildMember } from 'discord.js';
import { LevelService } from './levelService.js';

export enum QuestType {
  MESSAGES = 'MESSAGES',
  VOICE = 'VOICE',
  DICE = 'DICE',
  GAMES = 'GAMES',
  DAILY = 'DAILY'
}

/**
 * QuestService - Gerenciamento de missões diárias
 * 
 * Funcionalidades:
 * - Geração de missões aleatórias por usuário
 * - Acompanhamento de progresso (mensagens, voz, jogos)
 * - Resgate de recompensas (Dracmas e XP)
 * - Integração com sistema de Leveling
 */
export class QuestService {
  /**
   * Verifica se um membro é elegível para missões (possui o cargo necessário)
   */
  static isEligible(member: GuildMember): boolean {
    if (!questConfig.player_roles || questConfig.player_roles.length === 0) return true;
    return member.roles.cache.some(role => questConfig.player_roles.includes(role.id));
  }

  /**
   * Gera novas missões diárias para um usuário
   */
  static async generateDailyQuests(userId: string, guildId: string) {
    // Verificar se já existem missões para hoje
    const existing = await prisma.userQuest.findFirst({
      where: {
        userId,
        guildId,
        expiresAt: { gt: new Date() }
      }
    });

    if (existing) return;

    const types = Object.keys(QuestType) as QuestType[];
    const selectedTypes = this.shuffleArray(types).slice(0, questConfig.quests_per_day);

    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    for (const type of selectedTypes) {
      const config = questConfig.quest_types[type];
      const target = config.target || Math.floor(Math.random() * (config.max! - config.min! + 1)) + config.min!;

      // Recompensa baseada no target
      const rewardMoney = Math.floor(target * config.reward_base_money * questConfig.rewards.money_multiplier);
      const rewardXP = Math.floor(target * config.reward_base_xp * questConfig.rewards.xp_multiplier);

      await prisma.userQuest.create({
        data: {
          userId,
          guildId,
          type,
          targetValue: target,
          currentValue: 0,
          rewardMoney,
          rewardXP,
          expiresAt
        }
      });
    }

    logger.info(`[Quest] Geradas ${selectedTypes.length} missões para o usuário ${userId}`);
  }

  /**
   * Incrementa o progresso de uma missão
   */
  static async incrementProgress(userId: string, guildId: string, type: QuestType, amount: number = 1) {
    try {
      const quests = await prisma.userQuest.findMany({
        where: {
          userId,
          guildId,
          type,
          isCompleted: false,
          expiresAt: { gt: new Date() }
        }
      });

      for (const quest of quests) {
        const newValue = quest.currentValue + amount;
        const isCompleted = newValue >= quest.targetValue;

        await prisma.userQuest.update({
          where: { id: quest.id },
          data: {
            currentValue: newValue > quest.targetValue ? quest.targetValue : newValue,
            isCompleted
          }
        });

        if (isCompleted) {
          logger.info(`[Quest] Missão ${type} completada pelo usuário ${userId}`);
        }
      }
    } catch (error: any) {
      logger.error(`[Quest] Erro ao incrementar progresso da missão ${type} para ${userId}:`, error);
    }
  }

  /**
   * Resgata as recompensas de uma missão completada
   */
  static async claimReward(questId: string, member: GuildMember) {
    const quest = await prisma.userQuest.findUnique({ where: { id: questId } });

    if (!quest || !quest.isCompleted || quest.isClaimed) return null;

    try {
      return await prisma.$transaction(async (tx: any) => {
        // 1. Marcar como resgatada
        await tx.userQuest.update({
          where: { id: questId },
          data: { isClaimed: true }
        });

        // 2. Adicionar dracmas
        await tx.economy.upsert({
          where: { userId: quest.userId },
          update: { wallet: { increment: BigInt(quest.rewardMoney) } },
          create: { userId: quest.userId, wallet: BigInt(quest.rewardMoney), bank: 0n }
        });

        // 3. Adicionar XP e verificar Level Up
        const levelData = await tx.level.upsert({
          where: { userId: quest.userId },
          update: { xp: { increment: quest.rewardXP } },
          create: { userId: quest.userId, xp: quest.rewardXP, level: 0 }
        });

        // Verificar se subiu de nível
        const nextLevel = levelData.level + 1;
        const xpNeeded = LevelService.calculateXpForLevel(nextLevel);
        let leveledUp = false;
        let newLevel = levelData.level;
        let rewards: string[] = [];

        if (levelData.xp >= xpNeeded) {
          const updatedLevel = await tx.level.update({
            where: { userId: quest.userId },
            data: { level: { increment: 1 } }
          });
          leveledUp = true;
          newLevel = updatedLevel.level;
          
          // Verificar recompensas de cargo (executado fora da transação ou via member)
          rewards = await LevelService.checkLevelRewards(member, updatedLevel.level);
        }

        logger.info(`[Quest] Usuário ${quest.userId} resgatou recompensa: ${quest.rewardMoney} Dracmas, ${quest.rewardXP} XP`);

        return { 
          money: quest.rewardMoney, 
          xp: quest.rewardXP,
          leveledUp,
          newLevel,
          rewards
        };
      });
    } catch (error: any) {
      logger.error(`[Quest] Erro ao resgatar recompensa da missão ${questId}:`, error);
      return null;
    }
  }

  private static shuffleArray<T>(array: T[]): T[] {
    return array.sort(() => Math.random() - 0.5);
  }
}
