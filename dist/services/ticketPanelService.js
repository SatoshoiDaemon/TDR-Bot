import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
/**
 * Serviço de Painéis de Ticket
 * Gerencia criação, edição e envio de painéis
 */
export class TicketPanelService {
    /**
     * Cria um novo painel de ticket
     */
    static async createPanel(guildId, data) {
        // Verificar se config existe
        const config = await prisma.ticketConfig.findUnique({ where: { guildId } });
        if (!config)
            throw new Error('Configure o sistema de tickets primeiro');
        return prisma.ticketPanel.create({
            data: {
                guildId,
                title: data.title,
                description: data.description,
                bannerUrl: data.bannerUrl,
                type: data.type || 'button',
                askSubject: data.askSubject ?? true,
                askDescription: data.askDescription ?? true,
                askCloseReason: data.askCloseReason ?? true,
                options: data.options
            }
        });
    }
    /**
     * Atualiza um painel existente
     */
    static async updatePanel(panelId, data) {
        const updateData = { ...data };
        if (data.options) {
            updateData.options = data.options;
        }
        return prisma.ticketPanel.update({
            where: { id: panelId },
            data: updateData
        });
    }
    /**
     * Deleta um painel
     */
    static async deletePanel(panelId) {
        return prisma.ticketPanel.delete({ where: { id: panelId } });
    }
    /**
     * Lista todos os painéis de um servidor
     */
    static async listPanels(guildId) {
        return prisma.ticketPanel.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Obtém um painel pelo ID
     */
    static async getPanel(panelId) {
        return prisma.ticketPanel.findUnique({ where: { id: panelId } });
    }
    /**
     * Envia o painel para um canal
     */
    static async sendPanel(panelId, guild, channelId) {
        const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
        if (!panel)
            throw new Error('Painel não encontrado');
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            throw new Error('Canal não encontrado');
        const embed = this.buildPanelEmbed(panel);
        const components = this.buildPanelComponents(panel);
        const message = await channel.send({ embeds: [embed], components });
        // Atualizar painel com IDs
        await prisma.ticketPanel.update({
            where: { id: panelId },
            data: { channelId, messageId: message.id }
        });
        logger.info(`[TicketPanel] Painel ${panelId} enviado para canal ${channelId}`);
        return message;
    }
    /**
     * Constrói o embed do painel
     */
    static buildPanelEmbed(panel) {
        const embed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(panel.description)
            .setColor(EMBED_COLORS.PRIMARY)
            .setFooter({ text: `Sistema de Tickets | ${EMBED_CREDIT}` })
            .setTimestamp();
        if (panel.bannerUrl) {
            embed.setImage(panel.bannerUrl);
        }
        return embed;
    }
    /**
     * Constrói os componentes (botões/select) do painel
     */
    static buildPanelComponents(panel) {
        const options = panel.options;
        const rows = [];
        if (panel.type === 'select') {
            // Select Menu
            const select = new StringSelectMenuBuilder()
                .setCustomId(`ticket_open_${panel.id}`)
                .setPlaceholder('Selecione uma opção...')
                .addOptions(options.map(opt => ({
                label: opt.label,
                value: opt.id,
                emoji: opt.emoji || '🎫',
                description: opt.description?.substring(0, 100)
            })));
            rows.push(new ActionRowBuilder().addComponents(select));
        }
        else {
            // Buttons - max 5 por row
            for (let i = 0; i < options.length; i += 5) {
                const chunk = options.slice(i, i + 5);
                const buttons = chunk.map(opt => new ButtonBuilder()
                    .setCustomId(`ticket_open_${panel.id}_${opt.id}`)
                    .setLabel(opt.label)
                    .setEmoji(opt.emoji || '🎫')
                    .setStyle(ButtonStyle.Primary));
                rows.push(new ActionRowBuilder().addComponents(...buttons));
            }
        }
        return rows;
    }
    /**
     * Adiciona uma opção ao painel
     */
    static async addOption(panelId, option) {
        const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
        if (!panel)
            throw new Error('Painel não encontrado');
        const currentOptions = panel.options || [];
        currentOptions.push(option);
        return prisma.ticketPanel.update({
            where: { id: panelId },
            data: { options: currentOptions }
        });
    }
    /**
     * Remove uma opção do painel
     */
    static async removeOption(panelId, optionId) {
        const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
        if (!panel)
            throw new Error('Painel não encontrado');
        const currentOptions = panel.options || [];
        const filteredOptions = currentOptions.filter(o => o.id !== optionId);
        return prisma.ticketPanel.update({
            where: { id: panelId },
            data: { options: filteredOptions }
        });
    }
    /**
     * Atualiza a mensagem do painel no canal
     */
    static async refreshPanelMessage(panelId, guild) {
        const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
        if (!panel?.channelId || !panel?.messageId)
            return null;
        const channel = guild.channels.cache.get(panel.channelId);
        if (!channel)
            return null;
        try {
            const message = await channel.messages.fetch(panel.messageId);
            const embed = this.buildPanelEmbed(panel);
            const components = this.buildPanelComponents(panel);
            await message.edit({ embeds: [embed], components });
            return message;
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=ticketPanelService.js.map