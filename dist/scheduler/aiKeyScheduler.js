import { KeyManagerService } from '../services/keyManagerService.js';
import { aiConfig } from '../shared/config/yamlLoader.js';
import { logger } from '../shared/logger.js';
import cron from 'node-cron';
export class AIKeyScheduler {
    client;
    constructor(client) {
        this.client = client;
    }
    start() {
        if (!aiConfig.key_management.enabled)
            return;
        // Reset diário de tokens às 00:00
        if (aiConfig.key_management.auto_reset_daily) {
            cron.schedule('0 0 * * *', async () => {
                logger.info('Iniciando reset diário de uso de chaves API...');
                await KeyManagerService.resetDailyUsage();
            });
        }
        cron.schedule('*/5 * * * *', async () => {
            // O KeyManagerService já limpa cooldowns ao buscar chaves, 
            // mas este cron garante que o status no banco esteja sempre atualizado
            logger.debug('Verificando cooldowns de chaves API...');
            // A lógica de limpeza está dentro do getBestKey, mas podemos chamar explicitamente se necessário
            await KeyManagerService.clearExpiredCooldowns();
        });
        logger.info('AI Key Scheduler iniciado.');
    }
}
//# sourceMappingURL=aiKeyScheduler.js.map