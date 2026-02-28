import { Events } from 'discord.js';
import { prisma } from '../database/client.js';
import { QuestService, QuestType } from '../services/questService.js';
import { logger } from '../shared/logger.js';
import cron from 'node-cron';
export class VoiceQuestScheduler {
    client;
    constructor(client) {
        this.client = client;
    }
    start() {
        // Evento ao entrar/sair de call
        this.client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            const userId = newState.id;
            // Entrou em uma call (não era bot, não era mudo, etc)
            if (!oldState.channelId && newState.channelId && !newState.member?.user.bot) {
                await prisma.userVoiceState.upsert({
                    where: { userId },
                    update: { lastJoinedAt: new Date() },
                    create: { userId, lastJoinedAt: new Date() }
                });
            }
            // Saiu de uma call
            if (oldState.channelId && !newState.channelId) {
                await this.processVoiceTime(userId, newState.guild.id);
                await prisma.userVoiceState.delete({ where: { userId } }).catch(() => { });
            }
        });
        // Verificação periódica a cada 5 minutos para quem ainda está em call
        cron.schedule('*/5 * * * *', async () => {
            try {
                const activeUsers = await prisma.userVoiceState.findMany();
                for (const user of activeUsers) {
                    const processedMins = await this.processVoiceTime(user.userId, null); // Guild será buscado via client
                    // Atualizar lastJoinedAt para o próximo ciclo
                    await prisma.userVoiceState.update({
                        where: { userId: user.userId },
                        data: { lastJoinedAt: new Date(user.lastJoinedAt.getTime() + processedMins * 60000) }
                    }).catch((e) => logger.error(`Erro ao atualizar estado de voz para ${user.userId}:`, e));
                }
            }
            catch (err) {
                logger.error('Erro no ciclo de verificação de voz:', err);
            }
        });
        logger.info('Voice Quest Scheduler iniciado.');
    }
    async processVoiceTime(userId, guildId) {
        const voiceState = await prisma.userVoiceState.findUnique({ where: { userId } });
        if (!voiceState)
            return 0;
        const now = new Date();
        const diffMs = now.getTime() - voiceState.lastJoinedAt.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes > 0) {
            // Se guildId não foi passado, buscar do client
            if (!guildId) {
                const user = await this.client.users.fetch(userId);
                // Simplificação: assume o primeiro guild comum ou o guild configurado
                // Em um bot real, você iteraria pelos guilds onde o usuário está em call
            }
            // Para simplificar no MVP, incrementamos em todos os guilds onde o usuário tem missões de voz ativas
            const activeQuests = await prisma.userQuest.findMany({
                where: { userId, type: QuestType.VOICE, isCompleted: false, expiresAt: { gt: new Date() } }
            });
            for (const quest of activeQuests) {
                await QuestService.incrementProgress(userId, quest.guildId, QuestType.VOICE, diffMinutes);
            }
        }
        return diffMinutes;
    }
}
//# sourceMappingURL=voiceQuestScheduler.js.map