import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { TicketService } from '../services/ticketService.js';
import { TicketPanelService } from '../services/ticketPanelService.js';
import { EMBED_COLORS } from '../shared/embedTheme.js';
import { logger } from '../shared/logger.js';
import { randomUUID } from 'crypto';
/**
 * Handler de interações do sistema de tickets
 */
export class TicketInteractionHandler {
    /**
     * Processa interação relacionada a tickets
     */
    static async handle(interaction) {
        try {
            // Button Interactions
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('ticket_open_')) {
                    await this.handleOpenTicket(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_claim') {
                    await this.handleClaim(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_close') {
                    await this.handleClose(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_confirm_close') {
                    await this.handleConfirmClose(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_cancel_close') {
                    await this.handleCancelClose(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_leave') {
                    await this.handleLeave(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_staff_panel') {
                    await this.showStaffPanel(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_member_panel') {
                    await this.showMemberPanel(interaction);
                    return true;
                }
                if (interaction.customId.startsWith('ticket_rate_')) {
                    await this.showRatingModal(interaction);
                    return true;
                }
            }
            // String Select Menu Interactions
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('ticket_open_')) {
                    await this.handleOpenTicketSelect(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_staff_action') {
                    await this.handleStaffAction(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_member_action') {
                    await this.handleMemberAction(interaction);
                    return true;
                }
            }
            // User Select Menu Interactions
            if (interaction.isUserSelectMenu()) {
                if (interaction.customId === 'ticket_add_user') {
                    await this.handleAddUser(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_remove_user') {
                    await this.handleRemoveUser(interaction);
                    return true;
                }
            }
            // Modal Interactions
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('ticket_modal_')) {
                    await this.handleTicketModal(interaction);
                    return true;
                }
                if (interaction.customId.startsWith('ticket_close_modal_')) {
                    await this.handleCloseModal(interaction);
                    return true;
                }
                if (interaction.customId.startsWith('ticket_rating_modal_')) {
                    await this.handleRatingModal(interaction);
                    return true;
                }
                if (interaction.customId === 'ticket_panel_create_modal') {
                    await this.handlePanelCreateModal(interaction);
                    return true;
                }
                if (interaction.customId.startsWith('ticket_panel_add_option_')) {
                    await this.handlePanelAddOptionModal(interaction);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            logger.error('[TicketHandler] Erro ao processar interação:', error);
            return false;
        }
    }
    /**
     * Abre ticket via botão
     */
    static async handleOpenTicket(interaction) {
        // Format: ticket_open_{panelId}_{optionId}
        const parts = interaction.customId.split('_');
        const panelId = parts[2];
        const optionId = parts[3];
        const panel = await TicketPanelService.getPanel(panelId);
        if (!panel) {
            await interaction.reply({ content: '❌ Painel não encontrado.', flags: MessageFlags.Ephemeral });
            return;
        }
        // Verificar se precisa de modal
        if (panel.askSubject || panel.askDescription) {
            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${panelId}_${optionId || 'none'}`)
                .setTitle('Abrir Ticket');
            if (panel.askSubject) {
                const subjectInput = new TextInputBuilder()
                    .setCustomId('subject')
                    .setLabel('Qual o assunto?')
                    .setPlaceholder('Descreva brevemente o motivo do ticket...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);
                modal.addComponents(new ActionRowBuilder().addComponents(subjectInput));
            }
            if (panel.askDescription) {
                const descInput = new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Descreva o problema')
                    .setPlaceholder('Forneça mais detalhes...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(1000);
                modal.addComponents(new ActionRowBuilder().addComponents(descInput));
            }
            await interaction.showModal(modal);
            return;
        }
        // Abrir ticket diretamente
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await TicketService.openTicket(interaction.guild, interaction.user, panelId, optionId);
        if (result.existing) {
            await interaction.editReply({
                content: `⚠️ Você já possui um ticket aberto! <#${result.channelId}>`
            });
        }
        else {
            await interaction.editReply({
                content: `✅ Ticket criado! <#${result.channelId}>`
            });
        }
    }
    /**
     * Abre ticket via select menu
     */
    static async handleOpenTicketSelect(interaction) {
        const panelId = interaction.customId.replace('ticket_open_', '');
        const optionId = interaction.values[0];
        const panel = await TicketPanelService.getPanel(panelId);
        if (!panel) {
            await interaction.reply({ content: '❌ Painel não encontrado.', flags: MessageFlags.Ephemeral });
            return;
        }
        // Verificar se precisa de modal
        if (panel.askSubject || panel.askDescription) {
            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${panelId}_${optionId}`)
                .setTitle('Abrir Ticket');
            if (panel.askSubject) {
                const subjectInput = new TextInputBuilder()
                    .setCustomId('subject')
                    .setLabel('Qual o assunto?')
                    .setPlaceholder('Descreva brevemente o motivo do ticket...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(subjectInput));
            }
            if (panel.askDescription) {
                const descInput = new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Descreva o problema')
                    .setPlaceholder('Forneça mais detalhes...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(descInput));
            }
            await interaction.showModal(modal);
            return;
        }
        // Abrir ticket diretamente
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await TicketService.openTicket(interaction.guild, interaction.user, panelId, optionId);
        if (result.existing) {
            await interaction.editReply({
                content: `⚠️ Você já possui um ticket aberto! <#${result.channelId}>`
            });
        }
        else {
            await interaction.editReply({
                content: `✅ Ticket criado! <#${result.channelId}>`
            });
        }
    }
    /**
     * Processa modal de abertura de ticket
     */
    static async handleTicketModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        // Format: ticket_modal_{panelId}_{optionId}
        const parts = interaction.customId.split('_');
        const panelId = parts[2];
        const optionId = parts[3] !== 'none' ? parts[3] : undefined;
        let subject;
        let description;
        try {
            subject = interaction.fields.getTextInputValue('subject');
        }
        catch {
            subject = undefined;
        }
        try {
            description = interaction.fields.getTextInputValue('description');
        }
        catch {
            description = undefined;
        }
        const result = await TicketService.openTicket(interaction.guild, interaction.user, panelId, optionId, subject, description);
        if (result.existing) {
            await interaction.editReply({
                content: `⚠️ Você já possui um ticket aberto! <#${result.channelId}>`
            });
        }
        else {
            await interaction.editReply({
                content: `✅ Ticket criado! <#${result.channelId}>`
            });
        }
    }
    /**
     * Staff assume o ticket
     */
    static async handleClaim(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.editReply({ content: '❌ Este não é um canal de ticket.' });
            return;
        }
        const config = await TicketService.getConfig(interaction.guildId);
        if (!config) {
            await interaction.editReply({ content: '❌ Sistema não configurado.' });
            return;
        }
        // Verificar se é staff
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasStaffRole = config.staffRoleIds && config.staffRoleIds.length > 0 && config.staffRoleIds.some((id) => member.roles.cache.has(id));
        if (!hasStaffRole) {
            await interaction.editReply({ content: '❌ Apenas staff pode assumir tickets.' });
            return;
        }
        if (ticket.staffId) {
            await interaction.editReply({ content: '⚠️ Este ticket já foi assumido.' });
            return;
        }
        await TicketService.claimTicket(ticket.id, interaction.user.id, interaction.guild);
        await interaction.editReply({ content: '✅ Você assumiu este ticket!' });
    }
    /**
     * Fecha o ticket
     */
    static async handleClose(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Este não é um canal de ticket.', flags: MessageFlags.Ephemeral });
            return;
        }
        const config = await TicketService.getConfig(interaction.guildId);
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isStaff = config && config.staffRoleIds && config.staffRoleIds.some((id) => member.roles.cache.has(id));
        if (!isStaff && ticket.userId !== interaction.user.id) {
            await interaction.reply({ content: '❌ Você não tem permissão para fechar este ticket.', flags: MessageFlags.Ephemeral });
            return;
        }
        const panel = ticket.panelId ? await TicketPanelService.getPanel(ticket.panelId) : null;
        // Se pede motivo e é staff
        if (panel?.askCloseReason && isStaff) {
            const modal = new ModalBuilder()
                .setCustomId(`ticket_close_modal_${ticket.id}`)
                .setTitle('Fechar Ticket');
            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Motivo do fechamento')
                .setPlaceholder('Descreva o motivo...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(modal);
            return;
        }
        // Pedir confirmação
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId('ticket_confirm_close')
            .setLabel('Confirmar Fechamento')
            .setStyle(ButtonStyle.Danger), new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary));
        await interaction.reply({
            content: '⚠️ **Tem certeza que deseja fechar este ticket?**\nEsta ação será irreversível e o canal será excluído.',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
    /**
     * Confirma fechamento do ticket
     */
    static async handleConfirmClose(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Ticket não encontrado.', flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferUpdate();
        await interaction.editReply({ content: '🔒 Fechando ticket...', components: [] });
        await TicketService.closeTicket(ticket.id, interaction.user.id, interaction.guild);
    }
    /**
     * Cancela fechamento do ticket
     */
    static async handleCancelClose(interaction) {
        await interaction.update({ content: '✅ Ação cancelada.', components: [] });
    }
    /**
     * Modal de fechamento com motivo
     */
    static async handleCloseModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticketId = interaction.customId.replace('ticket_close_modal_', '');
        const reason = interaction.fields.getTextInputValue('reason') || undefined;
        await TicketService.closeTicket(ticketId, interaction.user.id, interaction.guild, reason);
        await interaction.editReply({ content: '✅ Ticket fechado com sucesso!' });
    }
    /**
     * Usuário sai do ticket
     */
    static async handleLeave(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Este não é um canal de ticket.', flags: MessageFlags.Ephemeral });
            return;
        }
        if (ticket.userId !== interaction.user.id) {
            await interaction.reply({ content: '❌ Apenas o dono do ticket pode sair.', flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setDescription('🚪 O dono do ticket saiu. Aguardando staff finalizar.')
            ]
        });
    }
    /**
     * Mostra painel de staff
     */
    static async showStaffPanel(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Este não é um canal de ticket.', flags: MessageFlags.Ephemeral });
            return;
        }
        const config = await TicketService.getConfig(interaction.guildId);
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasStaffRole = config && config.staffRoleIds && config.staffRoleIds.some((id) => member.roles.cache.has(id));
        if (!hasStaffRole) {
            await interaction.reply({ content: '❌ Apenas staff pode usar este painel.', flags: MessageFlags.Ephemeral });
            return;
        }
        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_staff_action')
            .setPlaceholder('Selecione uma ação...')
            .addOptions([
            { label: 'Chamar Usuário', value: 'call_user', emoji: '📢', description: 'Notifica o usuário via DM' },
            { label: 'Adicionar Membro', value: 'add_user', emoji: '➕', description: 'Adiciona alguém ao ticket' },
            { label: 'Remover Membro', value: 'remove_user', emoji: '➖', description: 'Remove alguém do ticket' },
            { label: 'Criar Voz', value: 'create_voice', emoji: '🔊', description: 'Cria canal de voz' },
            { label: 'Deletar Voz', value: 'delete_voice', emoji: '🔇', description: 'Remove canal de voz' }
        ]);
        await interaction.reply({
            content: '🛡️ **Painel Staff**',
            components: [new ActionRowBuilder().addComponents(menu)],
            flags: MessageFlags.Ephemeral
        });
    }
    /**
     * Mostra painel de membro
     */
    static async showMemberPanel(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Este não é um canal de ticket.', flags: MessageFlags.Ephemeral });
            return;
        }
        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_member_action')
            .setPlaceholder('Selecione uma ação...')
            .addOptions([
            { label: 'Chamar Staff', value: 'call_staff', emoji: '📢', description: 'Notifica o staff via DM' }
        ]);
        await interaction.reply({
            content: '👤 **Painel Membro**',
            components: [new ActionRowBuilder().addComponents(menu)],
            flags: MessageFlags.Ephemeral
        });
    }
    /**
     * Processa ação do staff
     */
    static async handleStaffAction(interaction) {
        const action = interaction.values[0];
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket)
            return;
        switch (action) {
            case 'call_user': {
                const user = await interaction.client.users.fetch(ticket.userId);
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(EMBED_COLORS.INFO)
                                .setTitle('📢 Chamado no Ticket')
                                .setDescription(`O staff está te chamando no ticket!`)
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(new ButtonBuilder()
                                .setLabel('Ir para o Ticket')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`))
                        ]
                    });
                    await interaction.update({ content: '✅ Usuário notificado!', components: [] });
                }
                catch {
                    await interaction.update({ content: '❌ Não foi possível enviar DM ao usuário.', components: [] });
                }
                break;
            }
            case 'add_user': {
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('ticket_add_user')
                    .setPlaceholder('Selecione um usuário...');
                await interaction.update({
                    content: '➕ Selecione o usuário para adicionar:',
                    components: [new ActionRowBuilder().addComponents(userSelect)]
                });
                break;
            }
            case 'remove_user': {
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('ticket_remove_user')
                    .setPlaceholder('Selecione um usuário...');
                await interaction.update({
                    content: '➖ Selecione o usuário para remover:',
                    components: [new ActionRowBuilder().addComponents(userSelect)]
                });
                break;
            }
            case 'create_voice': {
                await interaction.deferUpdate();
                try {
                    const vc = await TicketService.createVoiceChannel(ticket.id, interaction.guild);
                    await interaction.editReply({ content: `✅ Canal de voz criado: ${vc}`, components: [] });
                }
                catch (e) {
                    await interaction.editReply({ content: `❌ ${e.message}`, components: [] });
                }
                break;
            }
            case 'delete_voice': {
                await interaction.deferUpdate();
                try {
                    await TicketService.deleteVoiceChannel(ticket.id, interaction.guild);
                    await interaction.editReply({ content: '✅ Canal de voz deletado!', components: [] });
                }
                catch (e) {
                    await interaction.editReply({ content: `❌ ${e.message}`, components: [] });
                }
                break;
            }
        }
    }
    /**
     * Processa ação do membro
     */
    static async handleMemberAction(interaction) {
        const action = interaction.values[0];
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket)
            return;
        if (action === 'call_staff' && ticket.staffId) {
            const staff = await interaction.client.users.fetch(ticket.staffId);
            try {
                await staff.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLORS.WARNING)
                            .setTitle('📢 Chamado no Ticket')
                            .setDescription(`O usuário está te chamando no ticket!`)
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(new ButtonBuilder()
                            .setLabel('Ir para o Ticket')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`))
                    ]
                });
                await interaction.update({ content: '✅ Staff notificado!', components: [] });
            }
            catch {
                await interaction.update({ content: '❌ Não foi possível enviar DM ao staff.', components: [] });
            }
        }
        else {
            await interaction.update({ content: '⚠️ Nenhum staff assumiu este ticket ainda.', components: [] });
        }
    }
    /**
     * Adiciona usuário ao ticket
     */
    static async handleAddUser(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket)
            return;
        const userId = interaction.values[0];
        try {
            await TicketService.addUser(ticket.id, userId, interaction.guild);
            await interaction.update({ content: `✅ Usuário <@${userId}> adicionado!`, components: [] });
        }
        catch (e) {
            await interaction.update({ content: `❌ ${e.message}`, components: [] });
        }
    }
    /**
     * Remove usuário do ticket
     */
    static async handleRemoveUser(interaction) {
        const ticket = await TicketService.getByChannelId(interaction.channelId);
        if (!ticket)
            return;
        const userId = interaction.values[0];
        try {
            await TicketService.removeUser(ticket.id, userId, interaction.guild);
            await interaction.update({ content: `✅ Usuário <@${userId}> removido!`, components: [] });
        }
        catch (e) {
            await interaction.update({ content: `❌ ${e.message}`, components: [] });
        }
    }
    /**
     * Mostra modal de avaliação
     */
    static async showRatingModal(interaction) {
        const ticketId = interaction.customId.replace('ticket_rate_', '');
        const modal = new ModalBuilder()
            .setCustomId(`ticket_rating_modal_${ticketId}`)
            .setTitle('Avaliar Atendimento');
        const ratingInput = new TextInputBuilder()
            .setCustomId('rating')
            .setLabel('Nota (1 a 5)')
            .setPlaceholder('5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1);
        const commentInput = new TextInputBuilder()
            .setCustomId('comment')
            .setLabel('Comentário (opcional)')
            .setPlaceholder('Como foi sua experiência?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(ratingInput), new ActionRowBuilder().addComponents(commentInput));
        await interaction.showModal(modal);
    }
    /**
     * Processa avaliação
     */
    static async handleRatingModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticketId = interaction.customId.replace('ticket_rating_modal_', '');
        const ratingStr = interaction.fields.getTextInputValue('rating');
        const comment = interaction.fields.getTextInputValue('comment') || null;
        const rating = parseInt(ratingStr);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            await interaction.editReply({ content: '❌ A nota deve ser um número entre 1 e 5.' });
            return;
        }
        try {
            const ticketRating = await TicketService.submitRating(ticketId, rating, comment);
            const ticket = await TicketService.getById(ticketId);
            const config = ticket ? await TicketService.getConfig(ticket.guildId) : null;
            // Enviar para canal de avaliações se configurado
            if (config?.ratingChannelId && ticket) {
                const guild = interaction.client.guilds.cache.get(ticket.guildId);
                const ratingChannel = guild?.channels.cache.get(config.ratingChannelId);
                if (ratingChannel) {
                    const staff = ticket.staffId ? await interaction.client.users.fetch(ticket.staffId).catch(() => null) : null;
                    const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
                    await ratingChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(rating >= 4 ? EMBED_COLORS.SUCCESS : rating >= 3 ? EMBED_COLORS.WARNING : EMBED_COLORS.ERROR)
                                .setTitle('📊 Nova Avaliação')
                                .addFields({ name: '👤 Usuário', value: `${interaction.user}`, inline: true }, { name: '🛡️ Staff', value: staff?.toString() || 'N/A', inline: true }, { name: '⭐ Nota', value: stars, inline: true }, { name: '💬 Comentário', value: comment || 'Sem comentário', inline: false })
                                .setTimestamp()
                        ]
                    });
                }
            }
            await interaction.editReply({ content: '✅ Obrigado pela avaliação!' });
        }
        catch (e) {
            await interaction.editReply({ content: `❌ ${e.message}` });
        }
    }
    /**
     * Processa modal de criação de painel
     */
    static async handlePanelCreateModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const banner = interaction.fields.getTextInputValue('banner') || undefined;
        const type = interaction.fields.getTextInputValue('type');
        const optionLabel = interaction.fields.getTextInputValue('option_label');
        try {
            const panel = await TicketPanelService.createPanel(interaction.guildId, {
                title,
                description,
                bannerUrl: banner,
                type: type === 'select' ? 'select' : 'button',
                options: [
                    {
                        id: randomUUID(),
                        label: optionLabel,
                        emoji: '🎫'
                    }
                ]
            });
            await interaction.editReply({
                content: `✅ Painel criado com sucesso!\n` +
                    `ID: \`${panel.id}\`\n` +
                    `Use \`/ticket-panel send\` para enviá-lo a um canal.`
            });
        }
        catch (e) {
            await interaction.editReply({ content: `❌ ${e.message}` });
        }
    }
    /**
     * Processa modal de adicionar opção ao painel
     */
    static async handlePanelAddOptionModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const panelId = interaction.customId.replace('ticket_panel_add_option_', '');
        const label = interaction.fields.getTextInputValue('label');
        const emoji = interaction.fields.getTextInputValue('emoji') || '🎫';
        const description = interaction.fields.getTextInputValue('description') || undefined;
        const categoryId = interaction.fields.getTextInputValue('category_id') || undefined;
        const welcomeMessage = interaction.fields.getTextInputValue('welcome_message') || undefined;
        try {
            await TicketPanelService.addOption(panelId, {
                id: randomUUID(),
                label,
                emoji,
                description,
                categoryId,
                welcomeMessage
            });
            await interaction.editReply({ content: '✅ Opção adicionada ao painel!' });
        }
        catch (e) {
            await interaction.editReply({ content: `❌ ${e.message}` });
        }
    }
}
//# sourceMappingURL=ticketHandler.js.map