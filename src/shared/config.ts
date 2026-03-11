import { config } from 'dotenv';

config();

/**
 * Valida se uma string corresponde ao formato de ID do Discord (17-19 dígitos)
 */
function isValidDiscordId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return /^\d{17,19}$/.test(trimmed);
}

/**
 * Valida e retorna uma variável de ambiente obrigatória
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variável obrigatória não encontrada: ${key}`);
  }
  return value.trim();
}

/**
 * Valida e retorna uma variável de ambiente opcional com valor padrão
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Valida e retorna um número inteiro de variável de ambiente
 */
function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Valor inválido para ${key}: número inteiro esperado`);
  }
  return parsed;
}

/**
 * Valida e retorna um array de IDs do Discord de variável de ambiente
 */
function getBackupGuildIds(): string[] {
  const value = getRequiredEnv('BACKUP_GUILD_IDS');
  const ids = value.split(',').map(id => id.trim()).filter(id => id.length > 0);
  
  if (ids.length === 0) {
    throw new Error(`BACKUP_GUILD_IDS não pode estar vazio`);
  }
  
  for (const id of ids) {
    if (!isValidDiscordId(id)) {
      throw new Error(`BACKUP_GUILD_ID inválido: "${id}" (17-19 dígitos)`);
    }
  }
  
  return ids;
}

/**
 * Configuração centralizada da aplicação
 */
export const appConfig = {
  discord: {
    token: getRequiredEnv('DISCORD_TOKEN'),
    guildId: (() => {
      const id = getRequiredEnv('GUILD_ID');
      if (!isValidDiscordId(id)) {
        throw new Error(`GUILD_ID inválido: "${id}" (17-19 dígitos)`);
      }
      return id;
    })(),
    backupGuildIds: getBackupGuildIds(),
    systemCategory: getRequiredEnv('SYSTEM_CATEGORY'),
    snapshotHour: getIntEnv('SNAPSHOT_HOUR', 3)
  },
  database: {
    path: getOptionalEnv('DB_PATH', 'data/snapshots.db')
  },
  backup: {
    retentionDays: getIntEnv('BACKUP_RETENTION_DAYS', 30),
    intervalHours: getIntEnv('BACKUP_INTERVAL_HOURS', 1),
    webhookUrl: getOptionalEnv('BACKUP_WEBHOOK_URL', '')
  },
  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug'
  },
  commands: {
    prefix: getOptionalEnv('COMMAND_PREFIX', 'rg!')
  },
  loritta: {
    token: getRequiredEnv('LORITTA_API_TOKEN')
  }
} as const;
