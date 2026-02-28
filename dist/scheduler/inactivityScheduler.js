import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
import { appConfig } from '../shared/config.js';
import { ConfigService } from '../services/configService.js';
export class InactivityScheduler {
    client;
    constructor(client) {
        this.client = client;
    }
    getConfig() {
        return ConfigService.getConfig('inactivity.yml');
    }
    start() {
        const config = this.getConfig();
        if (!config?.enabled)
            return;
        // Verificar inatividade a cada 6 horas
        setInterval(() => this.checkInactivity(), 6 * 60 * 60 * 1000);
        // Primeira verificação 2 minutos após o boot
        setTimeout(() => this.checkInactivity(), 2 * 60 * 1000);
        logger.info('Serviço de Inatividade iniciado.');
    }
    async checkInactivity() {
        const config = this.getConfig();
        if (!config?.enabled)
            return;
        try {
            const inactiveDays = config.inactive_days || 14;
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);
            // Buscar usuários que não enviam mensagem há X dias
            const inactiveLevels = await prisma.level.findMany({
                where: {
                    lastMessage: { lte: thresholdDate }
                },
                include: {
                    user: true
                }
            });
            if (inactiveLevels.length === 0) {
                logger.info(`[Inatividade] Nenhum membro inativo encontrado (threshold: ${inactiveDays} dias).`);
                return;
            }
            const guild = await this.client.guilds.fetch(appConfig.discord.guildId).catch(() => null);
            if (!guild) {
                logger.error('[Inatividade] Servidor principal não encontrado.');
                return;
            }
            const notificationChannel = config.notification_channel_id
                ? await guild.channels.fetch(config.notification_channel_id).catch(() => null)
                : null;
            if (!notificationChannel) {
                logger.warn('[Inatividade] Canal de notificação não encontrado ou não configurado.');
                return;
            }
            let notifiedCount = 0;
            for (const level of inactiveLevels) {
                const wasNotified = await this.notifyInactiveMember(level, guild, notificationChannel, config);
                if (wasNotified)
                    notifiedCount++;
                // Delay anti rate limit
                await new Promise(r => setTimeout(r, 500));
            }
            logger.info(`[Inatividade] Verificação concluída: ${inactiveLevels.length} inativos encontrados, ${notifiedCount} notificados.`);
        }
        catch (error) {
            logger.error('[Inatividade] Erro ao processar inatividade:', error);
        }
    }
    async notifyInactiveMember(level, guild, channel, config) {
        try {
            const member = await guild.members.fetch(level.userId).catch(() => null);
            if (!member)
                return false;
            // Evitar notificar bots
            if (member.user.bot)
                return false;
            const replacePlaceholders = (str) => str.replace(/{user}/g, member.toString())
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, guild.name)
                .replace(/{days}/g, (config.inactive_days || 14).toString());
            const embed = new EmbedBuilder()
                .setColor(config.message?.embed?.color || EMBED_COLORS.ERROR)
                .setTitle(replacePlaceholders(config.message?.embed?.title || 'Sentimos sua falta!'))
                .setDescription(replacePlaceholders(config.message?.embed?.description || `Você não envia mensagens há mais de ${config.inactive_days} dias.`))
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            const button = new ButtonBuilder()
                .setCustomId(`feedback_${member.id}`)
                .setLabel(config.feedback_button?.label || 'Dar Feedback')
                .setStyle(ButtonStyle[config.feedback_button?.style] || ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(button);
            await channel.send({
                content: replacePlaceholders(config.message?.content || `Olá {user}, notamos que você está um pouco sumido!`),
                embeds: [embed],
                components: [row]
            });
            return true;
        }
        catch (error) {
            logger.error(`[Inatividade] Falha ao notificar membro inativo ${level.userId}:`, error);
            return false;
        }
    }
}
//# sourceMappingURL=inactivityScheduler.js.map