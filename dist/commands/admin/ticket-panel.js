import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { TicketPanelService } from '../../services/ticketPanelService.js';
import { TicketService } from '../../services/ticketService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
/**
 * Comando /ticket-panel - Gerenciar painéis de ticket
 */
export const ticketPanelCommand = {
    name: 'ticket-panel',
    description: 'Gerencia os painéis de tickets do servidor',
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Gerencia os painéis de tickets do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('create')
        .setDescription('Cria um novo painel de tickets'))
        .addSubcommand(sub => sub.setName('list')
        .setDescription('Lista todos os painéis configurados'))
        .addSubcommand(sub => sub.setName('send')
        .setDescription('Envia um painel para um canal')
        .addStringOption(opt => opt.setName('painel')
        .setDescription('ID do painel')
        .setRequired(true)
        .setAutocomplete(true))
        .addChannelOption(opt => opt.setName('canal')
        .setDescription('Canal para enviar o painel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub => sub.setName('delete')
        .setDescription('Deleta um painel')
        .addStringOption(opt => opt.setName('painel')
        .setDescription('ID do painel')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('add-option')
        .setDescription('Adiciona uma opção ao painel')
        .addStringOption(opt => opt.setName('painel')
        .setDescription('ID do painel')
        .setRequired(true)
        .setAutocomplete(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'create') {
                await this.handleCreate(interaction);
            }
            else if (subcommand === 'list') {
                await this.handleList(interaction);
            }
            else if (subcommand === 'send') {
                await this.handleSend(interaction);
            }
            else if (subcommand === 'delete') {
                await this.handleDelete(interaction);
            }
            else if (subcommand === 'add-option') {
                await this.handleAddOption(interaction);
            }
        }
        catch (error) {
            logger.error('[TicketPanel] Erro:', error);
            const content = `❌ Erro: ${error.message}`;
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content });
            }
            else {
                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
            }
        }
    },
    /**
     * Criar painel via modal
     */
    async handleCreate(interaction) {
        // Verificar configuração
        const config = await TicketService.getConfig(interaction.guildId);
        if (!config) {
            await interaction.reply({
                content: '❌ Configure primeiro o sistema de tickets usando `/config` → Tickets.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        const modal = new ModalBuilder()
            .setCustomId('ticket_panel_create_modal')
            .setTitle('Criar Painel de Tickets');
        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Título do painel')
            .setPlaceholder('Ex: Central de Suporte')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);
        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição')
            .setPlaceholder('Ex: Clique no botão abaixo para abrir um ticket!')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000);
        const bannerInput = new TextInputBuilder()
            .setCustomId('banner')
            .setLabel('URL do Banner (opcional)')
            .setPlaceholder('https://exemplo.com/imagem.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const typeInput = new TextInputBuilder()
            .setCustomId('type')
            .setLabel('Tipo: button ou select')
            .setPlaceholder('button')
            .setStyle(TextInputStyle.Short)
            .setValue('button')
            .setRequired(true);
        const optionLabelInput = new TextInputBuilder()
            .setCustomId('option_label')
            .setLabel('Nome do primeiro botão/opção')
            .setPlaceholder('Ex: Abrir Ticket')
            .setStyle(TextInputStyle.Short)
            .setValue('🎫 Abrir Ticket')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput), new ActionRowBuilder().addComponents(bannerInput), new ActionRowBuilder().addComponents(typeInput), new ActionRowBuilder().addComponents(optionLabelInput));
        await interaction.showModal(modal);
    },
    /**
     * Listar painéis
     */
    async handleList(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const panels = await TicketPanelService.listPanels(interaction.guildId);
        if (panels.length === 0) {
            await interaction.editReply({
                content: '📋 Nenhum painel configurado. Use `/ticket-panel create` para criar um.'
            });
            return;
        }
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.INFO)
            .setTitle('🎫 Painéis de Tickets')
            .setDescription(panels.map((p, i) => {
            const options = p.options;
            return `**${i + 1}. ${p.title}**\n` +
                `   ID: \`${p.id}\`\n` +
                `   Tipo: ${p.type}\n` +
                `   Opções: ${options.length}\n` +
                `   Canal: ${p.channelId ? `<#${p.channelId}>` : 'Não enviado'}`;
        }).join('\n\n'))
            .setFooter({ text: EMBED_CREDIT });
        await interaction.editReply({ embeds: [embed] });
    },
    /**
     * Enviar painel para canal
     */
    async handleSend(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const panelId = interaction.options.getString('painel', true);
        const channel = interaction.options.getChannel('canal', true);
        await TicketPanelService.sendPanel(panelId, interaction.guild, channel.id);
        await interaction.editReply({
            content: `✅ Painel enviado para ${channel}!`
        });
    },
    /**
     * Deletar painel
     */
    async handleDelete(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const panelId = interaction.options.getString('painel', true);
        await TicketPanelService.deletePanel(panelId);
        await interaction.editReply({
            content: '✅ Painel deletado com sucesso!'
        });
    },
    /**
     * Adicionar opção ao painel
     */
    async handleAddOption(interaction) {
        const panelId = interaction.options.getString('painel', true);
        const modal = new ModalBuilder()
            .setCustomId(`ticket_panel_add_option_${panelId}`)
            .setTitle('Adicionar Opção ao Painel');
        const labelInput = new TextInputBuilder()
            .setCustomId('label')
            .setLabel('Nome da opção')
            .setPlaceholder('Ex: Suporte Técnico')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel('Emoji (opcional)')
            .setPlaceholder('🛠️')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição curta (opcional)')
            .setPlaceholder('Para problemas técnicos')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100);
        const categoryInput = new TextInputBuilder()
            .setCustomId('category_id')
            .setLabel('ID da categoria (opcional)')
            .setPlaceholder('ID para categoria específica')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const welcomeMsgInput = new TextInputBuilder()
            .setCustomId('welcome_message')
            .setLabel('Mensagem de boas-vindas (opcional)')
            .setPlaceholder('Olá! Como podemos ajudar?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(labelInput), new ActionRowBuilder().addComponents(emojiInput), new ActionRowBuilder().addComponents(descInput), new ActionRowBuilder().addComponents(categoryInput), new ActionRowBuilder().addComponents(welcomeMsgInput));
        await interaction.showModal(modal);
    },
    /**
     * Autocomplete para painéis
     */
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'painel') {
            const panels = await TicketPanelService.listPanels(interaction.guildId);
            const filtered = panels
                .filter((p) => p.title.toLowerCase().includes(focused.value.toLowerCase()))
                .slice(0, 25);
            await interaction.respond(filtered.map((p) => ({ name: `${p.title} (${p.type})`, value: p.id })));
        }
    }
};
//# sourceMappingURL=ticket-panel.js.map