import cron from 'node-cron';
import { SnapshotService } from '../services/snapshotService.js';
import { MirrorService } from '../services/mirrorService.js';
import { BackupLogger } from '../services/backupLogger.js';
export class SnapshotScheduler {
    client;
    database;
    config;
    snapshotService;
    mirrorService;
    backupLogger;
    constructor(client, database, config) {
        this.client = client;
        this.database = database;
        this.config = config;
        this.snapshotService = new SnapshotService(client, database);
        this.mirrorService = new MirrorService(client, database);
        this.backupLogger = new BackupLogger(config.webhookUrl);
    }
    start() {
        const cronExpression = `0 ${this.config.snapshotHour} * * *`;
        console.log(`Snapshots diários agendados para ${this.config.snapshotHour}:00`);
        console.log(`Destinos de backup: ${this.config.backupGuildIds.length} servidor(es)`);
        console.log(`Modo: Sequencial`);
        cron.schedule(cronExpression, async () => {
            await this.runDailySnapshot();
        });
        console.log(`Scheduler iniciado.`);
    }
    async runDailySnapshot() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Snapshot diário iniciado — ${new Date().toLocaleString('pt-BR')}`);
        console.log(`Backups a processar: ${this.config.backupGuildIds.length}`);
        console.log('='.repeat(60));
        // Initialize logger
        this.backupLogger.start(this.config.backupGuildIds.length);
        try {
            console.log('\nEtapa 1: Snapshot completo da guild');
            this.backupLogger.log('info', 'Snapshot completo da guild iniciado');
            await this.snapshotService.createGuildSnapshot(this.config.guildId);
            this.backupLogger.log('success', 'Snapshot da guild concluído');
            console.log('\nEtapa 2: Snapshot da categoria');
            this.backupLogger.log('info', 'Snapshot da categoria iniciado');
            await this.snapshotService.createCategorySnapshot(this.config.guildId, this.config.systemCategory);
            this.backupLogger.log('success', 'Snapshot da categoria concluído');
            console.log('\nEtapa 3: Espelhamento para servidores de backup');
            for (let i = 0; i < this.config.backupGuildIds.length; i++) {
                const backupGuildId = this.config.backupGuildIds[i];
                console.log(`\n${'─'.repeat(60)}`);
                console.log(`Processando backup ${i + 1}/${this.config.backupGuildIds.length}: ${backupGuildId}`);
                console.log(`${'─'.repeat(60)}`);
                try {
                    const startTime = Date.now();
                    this.backupLogger.log('info', `Backup ${i + 1}/${this.config.backupGuildIds.length} iniciado`, i + 1);
                    await this.mirrorService.mirrorCategory(this.config.guildId, backupGuildId, this.config.systemCategory);
                    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
                    console.log(`Backup ${i + 1}/${this.config.backupGuildIds.length} concluído em ${duration} min\n`);
                    this.backupLogger.log('success', `Backup ${i + 1}/${this.config.backupGuildIds.length} concluído em ${duration} min`, i + 1);
                }
                catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`Erro ao espelhar para backup ${i + 1}/${this.config.backupGuildIds.length}: ${errorMsg}`);
                    console.error(`Continuando com próximo backup...\n`);
                    this.backupLogger.log('error', `Backup ${i + 1}/${this.config.backupGuildIds.length} falhou: ${errorMsg}`, i + 1);
                }
            }
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Ciclo de snapshot diário concluído.`);
            console.log(`Servidores processados: ${this.config.backupGuildIds.length}`);
            console.log('='.repeat(60) + '\n');
            this.backupLogger.log('success', `Ciclo de snapshot diário concluído.`);
            // Send logs to webhook
            await this.backupLogger.sendToWebhook();
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`\nErro durante snapshot diário: ${errorMsg}`);
            console.error(error);
            console.log('='.repeat(60) + '\n');
            this.backupLogger.log('error', `Erro crítico durante snapshot: ${errorMsg}`);
            await this.backupLogger.sendToWebhook();
        }
    }
    async runManualSnapshot() {
        console.log('Executando snapshot manual...');
        await this.runDailySnapshot();
    }
}
//# sourceMappingURL=scheduler.js.map