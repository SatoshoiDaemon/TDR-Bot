import { logger } from '../shared/logger.js';
import { chatMovementConfig } from '../shared/config/yamlLoader.js';
import { TimerManager } from '../shared/timerManager.js';
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
        this.interval = TimerManager.setInterval(() => {
            this.run();
        }, hours * 60 * 60 * 1000);
        // Initial check delayed slightly to not clog boot
        TimerManager.setTimeout(() => this.run(), 5 * 60 * 1000); // 5 minutes after start
    }
    async run() {
        if (!chatMovementConfig?.enabled)
            return;
        // Horário de silêncio: entre 23:00 e 10:00 (Horário de Brasília, UTC-3)
        const nowBRT = new Date(Date.now() - (3 * 60 * 60 * 1000)); // UTC-3
        const hourBRT = nowBRT.getUTCHours();
        if (hourBRT >= 23 || hourBRT < 10) {
            logger.info(`[AutoChat] Horário de silêncio (${hourBRT}h BRT). Pulando verificação.`);
            return;
        }
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
            // Fetch the last maximum number of messages from Discord (Up to 100 which is the hard API limit for a single fetch)
            const messages = await channel.messages.fetch({ limit: 100 });
            const hoursAgo = Date.now() - ((chatMovementConfig.interval_hours || 4) * 60 * 60 * 1000);
            // Filter recent messages in that timeframe
            const recentMessages = messages.filter(msg => msg.createdTimestamp >= hoursAgo);
            // Se o canal estiver mais morto que a taxa de conversação aceitável, e a ÚLTIMA MENSAGEM enviada tiver sido há pelo menos 1H para trás (Evitando cortar uma conversa que está morrendo agora)
            if (recentMessages.size <= threshold) {
                // Pega a mensagem mais recente enviada no grupo
                const freshestMessage = messages.first();
                const wasLastMessageLongTimeAgo = freshestMessage ? (Date.now() - freshestMessage.createdTimestamp) > (60 * 60 * 1000) : true;
                if (wasLastMessageLongTimeAgo) {
                    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                    const pingMessage = pingRoleId ? `<@&${pingRoleId}>` : '';
                    await channel.send(`${pingMessage}\n\n💬 **Hora do Papo:**\n${randomQuestion}`);
                    logger.info(`[AutoChat] O canal estava quieto (${recentMessages.size} msgs nas últimas ${chatMovementConfig.interval_hours}H). Uma pergunta foi enviada.`);
                }
                else {
                    logger.info(`[AutoChat] O canal teve poucas msgs (${recentMessages.size}), mas a conversa ainda não esfriou completamente (A última msg foi em menos de 1h). Pulo.`);
                }
            }
        }
        catch (error) {
            logger.error('[AutoChat] Erro na verificação de inatividade de chat:', error);
        }
    }
    stop() {
        if (this.interval)
            TimerManager.clearInterval(this.interval);
    }
}
//# sourceMappingURL=chatMovementScheduler.js.map