import { Client } from 'discord.js';
import { StarBoardService } from '@services/starBoardService.js';
import { appConfig } from '@shared/config.js';
import { logger } from '@shared/logger.js';
import { ConfigService } from '@services/configService.js';
import type { ProfileConfig } from '../types/configs/profile.js';

export class StarBoardScheduler {
  private client: Client;
  private interval: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start() {
    logger.info('Agendador do StarBoard iniciado.');

    // Executar a cada 1.5 horas
    this.interval = setInterval(() => {
      this.run();
    }, 1.5 * 60 * 60 * 1000);

    // Execução inicial após 1 minuto para não sobrecarregar o boot
    setTimeout(() => this.run(), 60000);
  }

  async run() {
    // Agora usando sistema dinâmico de configurações configuráveis in-discord
    const profileConfig = ConfigService.getConfig<ProfileConfig>('profile.yml');
    const channelId = profileConfig.starboard?.channel_id;

    if (!channelId) {
      logger.warn('Canal de StarBoard não configurado. Pulando destaque.');
      return;
    }

    await StarBoardService.featureRandomProfile(this.client, appConfig.discord.guildId, channelId);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
