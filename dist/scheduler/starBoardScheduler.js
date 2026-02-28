import { StarBoardService } from '../services/starBoardService.js';
import { appConfig } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { ConfigService } from '../services/configService.js';
export class StarBoardScheduler {
    client;
    interval = null;
    constructor(client) {
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
        const profileConfig = ConfigService.getConfig('profile.yml');
        const channelId = profileConfig.starboard?.channel_id;
        if (!channelId) {
            logger.warn('Canal de StarBoard não configurado. Pulando destaque.');
            return;
        }
        await StarBoardService.featureRandomProfile(this.client, appConfig.discord.guildId, channelId);
    }
    stop() {
        if (this.interval)
            clearInterval(this.interval);
    }
}
//# sourceMappingURL=starBoardScheduler.js.map