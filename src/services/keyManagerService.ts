import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { aiConfig } from '@shared/config/yamlLoader.js';

export interface APIKeyData {
  id: string;
  key: string;
  status: string;
  usedTokensToday: number;
  dailyTokenLimit: number;
}

export class KeyManagerService {
  private static lastKeyIndex = -1;

  /**
   * Obtém a melhor chave disponível com base na estratégia configurada
   */
  static async getBestKey(): Promise<APIKeyData | null> {
    if (!aiConfig.key_management.enabled) {
      const envKey = process.env.GEMINI_API_KEY;
      if (!envKey) return null;
      return {
        id: 'env-default',
        key: envKey,
        status: 'active',
        usedTokensToday: 0,
        dailyTokenLimit: 1000000
      };
    }

    try {
      // Limpar cooldowns expirados agora é feito por cron
      // await this.clearExpiredCooldowns();

      const activeKeys = await prisma.aPIKey.findMany({
        where: {
          status: 'active',
          OR: [
            { cooldownUntil: null },
            { cooldownUntil: { lte: new Date() } }
          ]
        },
        orderBy: { priority: 'desc' }
      });

      if (activeKeys.length === 0) {
        logger.error('Nenhuma chave API ativa disponível no pool!');
        return null;
      }

      // Filtrar chaves que atingiram o limite de tokens (com buffer)
      const availableKeys = activeKeys.filter((k: any) =>
        k.usedTokensToday < (k.dailyTokenLimit * aiConfig.key_management.token_limit_buffer)
      );

      if (availableKeys.length === 0) {
        logger.error('Todas as chaves API atingiram o limite de tokens diário!');
        return null;
      }

      let selectedKey;
      const strategy = aiConfig.key_management.strategy;

      switch (strategy) {
        case 'round-robin':
          this.lastKeyIndex = (this.lastKeyIndex + 1) % availableKeys.length;
          selectedKey = availableKeys[this.lastKeyIndex];
          break;

        case 'least-used':
          selectedKey = availableKeys.reduce((prev: any, curr: any) =>
            prev.usedTokensToday < curr.usedTokensToday ? prev : curr
          );
          break;

        case 'priority':
        default:
          selectedKey = availableKeys[0]; // Já ordenado por prioridade no findMany
          break;
      }

      return {
        id: selectedKey.id,
        key: selectedKey.key,
        status: selectedKey.status,
        usedTokensToday: selectedKey.usedTokensToday,
        dailyTokenLimit: selectedKey.dailyTokenLimit
      };
    } catch (error: any) {
      logger.error('Erro ao buscar melhor chave API:', error);
      return null;
    }
  }

  /**
   * Registra o uso de tokens por uma chave
   */
  static async recordUsage(keyId: string, tokens: number, status: number = 200) {
    if (keyId === 'env-default') return;

    try {
      await prisma.$transaction([
        prisma.aPIKey.update({
          where: { id: keyId },
          data: {
            usedTokensToday: { increment: tokens },
            lastUsed: new Date()
          }
        }),
        prisma.keyUsageLog.create({
          data: {
            keyId,
            tokensUsed: tokens,
            status
          }
        })
      ]);
    } catch (error: any) {
      logger.error(`Erro ao registrar uso da chave ${keyId}:`, error);
    }
  }

  /**
   * Marca uma chave como Rate Limited
   */
  static async handleRateLimit(keyId: string) {
    if (keyId === 'env-default') return;

    const cooldownMinutes = aiConfig.key_management.default_cooldown_minutes;
    const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60000);

    try {
      await prisma.aPIKey.update({
        where: { id: keyId },
        data: {
          status: 'rate_limited',
          rateLimitedAt: new Date(),
          cooldownUntil
        }
      });
      logger.warn(`Chave ${keyId} marcada como Rate Limited até ${cooldownUntil.toISOString()}`);
    } catch (error: any) {
      logger.error(`Erro ao tratar rate limit da chave ${keyId}:`, error);
    }
  }

  /**
   * Desativa uma chave permanentemente (ex: erro de autenticação)
   */
  static async disableKey(keyId: string, reason: string) {
    if (keyId === 'env-default') return;

    try {
      await prisma.aPIKey.update({
        where: { id: keyId },
        data: { status: 'invalid' }
      });
      logger.error(`Chave ${keyId} desativada permanentemente. Motivo: ${reason}`);
    } catch (error: any) {
      logger.error(`Erro ao desativar chave ${keyId}:`, error);
    }
  }

  /**
   * Limpa cooldowns expirados
   */
  static async clearExpiredCooldowns() {
    try {
      await prisma.aPIKey.updateMany({
        where: {
          status: 'rate_limited',
          cooldownUntil: { lte: new Date() }
        },
        data: {
          status: 'active',
          cooldownUntil: null
        }
      });
    } catch (error: any) {
      logger.error('Erro ao limpar cooldowns expirados:', error);
    }
  }

  /**
   * Reseta o contador diário de tokens de todas as chaves
   */
  static async resetDailyUsage() {
    try {
      await prisma.aPIKey.updateMany({
        data: { usedTokensToday: 0 }
      });
      logger.info('Contadores diários de tokens resetados.');
    } catch (error: any) {
      logger.error('Erro ao resetar uso diário de chaves:', error);
    }
  }
}
