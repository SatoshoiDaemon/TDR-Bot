import { logger } from '../shared/logger.js';
import { chatMovementConfig } from '../shared/config/yamlLoader.js';
export class ChatMovementScheduler {
    client;
    interval = null;
    guildId;
    constructor(client, guildId) {
        this.client = client;
        this.guildId = guildId;
    }
    start() {
        if (!chatMovementConfig?.enabled)
            return;
        logger.info('Agendador de Movimentação de Chat (Auto Chat) iniciado.');
        const hours = chatMovementConfig.interval_hours || 4;
        this.interval = setInterval(() => {
            this.run();
        }, hours * 60 * 60 * 1000);
        // Initial check delayed slightly to not clog boot
        setTimeout(() => this.run(), 5 * 60 * 1000); // 5 minutes after start
    }
    async run() {
        if (!chatMovementConfig?.enabled)
            return;
        try {
            const channelId = chatMovementConfig.channel_id;
            const pingRoleId = chatMovementConfig.ping_role_id;
            const threshold = chatMovementConfig.trigger_threshold_messages || 10;
            const questions = chatMovementConfig.questions || [];
            if (!channelId || questions.length === 0)
                return;
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild)
                return;
            const channel = await guild.channels.fetch(channelId);
            if (!channel || !channel.isTextBased())
                return;
            // Fetch the last maximum number of messages (say 50 max to check timeframe)
            const messages = await channel.messages.fetch({ limit: 50 });
            const hoursAgo = Date.now() - ((chatMovementConfig.interval_hours || 4) * 60 * 60 * 1000);
            // Filter recent messages in that timeframe
            const recentMessages = messages.filter(msg => msg.createdTimestamp >= hoursAgo);
            // Se o canal estiver mais morto que a taxa de conversação, jogue a pergunta
            if (recentMessages.size <= threshold) {
                const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                const pingMessage = pingRoleId ? `<@&${pingRoleId}>` : '';
                await channel.send(`${pingMessage}\n\n💬 **Hora do Papo:**\n${randomQuestion}`);
                logger.info(`[AutoChat] O canal estava quieto (${recentMessages.size} msgs nas últimas ${chatMovementConfig.interval_hours}H). Uma pergunta foi enviada.`);
            }
        }
        catch (error) {
            logger.error('[AutoChat] Erro na verificação de inatividade de chat:', error);
        }
    }
    stop() {
        if (this.interval)
            clearInterval(this.interval);
    }
}
//# sourceMappingURL=chatMovementScheduler.js.map