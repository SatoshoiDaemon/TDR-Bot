/**
 * Config Module: Tickets
 * Configurações de Tickets com Wizard UI (Multi-Type Support)
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    type MessageComponentInteraction,
    ChannelType,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ModalSubmitInteraction,
    type ButtonInteraction,
    type StringSelectMenuInteraction,
    type RoleSelectMenuInteraction,
    type ChannelSelectMenuInteraction
    ,
    MessageFlags
} from 'discord.js';
import { TicketService } from '@services/ticketService.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS } from '@shared/embedTheme.js';

// Simple in-memory state for wizard steps
interface WizardState {
    channelId?: string;
    title?: string;
    description?: string;
    bannerUrl?: string;
    type?: 'button' | 'select';

    // Button specific
    buttonText?: string;
    buttonEmoji?: string;
    buttonStyle?: ButtonStyle;

    // Select specific
    placeholder?: string;
    options: Array<{
        label: string;
        emoji?: string;
        description?: string;
        value?: string; // internal id
    }>;
}

const wizardStates = new Map<string, WizardState>();

/**
 * Menu Ticket Principal
 */
export async function showTicketMenu(
    interaction: any,
    backHandler?: any
) {
    try {
        const config = await TicketService.getConfig(interaction.guildId!);

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.INFO)
            .setTitle('🎫 Configurações de Tickets')
            .setDescription(
                config
                    ? `**Status:** ✅ Configurado\n` +
                    `**Cargos Staff:** ${config.staffRoleIds?.length ? config.staffRoleIds.map((id: string) => `<@&${id}>`).join(', ') : 'Nenhum'}\n` +
                    `**Categoria:** <#${config.defaultCategoryId}>\n` +
                    `**Canal de Logs:** ${config.logsChannelId ? `<#${config.logsChannelId}>` : 'Não definido'}\n` +
                    `**Canal de Avaliações:** ${config.ratingChannelId ? `<#${config.ratingChannelId}>` : 'Não definido'}\n\n` +
                    `Use o menu abaixo para alterar ou \`/ticket-panel\` para gerenciar painéis.`
                    : `**Status:** ❌ Não configurado\n\n` +
                    `Configure as opções abaixo para ativar o sistema de tickets.`
            );

        const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('config_ticket_menu')
                .setPlaceholder('Selecione uma opção...')
                .addOptions([
                    { label: 'Definir Cargos Staff', value: 'set_staff', emoji: '🛡️', description: 'Cargos que podem gerenciar tickets' },
                    { label: 'Definir Categoria', value: 'set_category', emoji: '📁', description: 'Categoria onde tickets serão criados' },
                    { label: 'Definir Canal de Logs', value: 'set_logs', emoji: '📋', description: 'Canal para transcripts e logs' },
                    { label: 'Definir Canal de Avaliações', value: 'set_rating', emoji: '⭐', description: 'Canal para avaliações' },
                    { label: 'Criar Painel (Wizard)', value: 'create_panel', emoji: '✨', description: 'Criar novo painel passo-a-passo' }
                ])
        );

        const backBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('config_back_to_main')
                .setLabel('Voltar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components: [menu, backBtn], content: null });
        } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            await (interaction as any).update({ embeds: [embed], components: [menu, backBtn], content: null });
        } else {
            await interaction.reply({ embeds: [embed], components: [menu, backBtn], flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        logger.error('[ConfigCommand] Erro em showTicketMenu:', error);
        await interaction.reply({ content: '❌ Erro ao carregar configurações de tickets.', flags: MessageFlags.Ephemeral }).catch(() => { });
    }
}

/**
 * Handler Central para Interações de Tickets
 */
export async function handleTicketInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const customId = interaction.customId;

    try {
        if (customId === 'config_ticket_back') return await showTicketMenu(interaction);
        if (customId === 'cancel_ticket_config') return await showTicketMenu(interaction);

        // Menu Principal
        if (customId === 'config_ticket_menu' && interaction.isStringSelectMenu()) {
            const option = interaction.values[0];
            if (option === 'create_panel') {
                await startPanelWizard(interaction);
            } else {
                await handleTicketConfigOption(interaction, option);
            }
            return;
        }

        // Config Options Handlers
        if (customId === 'ticket_set_staff_role' && interaction.isRoleSelectMenu()) {
            await handleStaffRoleSelect(interaction);
            return;
        }
        if ((customId === 'ticket_set_category' || customId === 'ticket_set_logs' || customId === 'ticket_set_rating') && interaction.isChannelSelectMenu()) {
            await handleChannelSelect(interaction);
            return;
        }

        // Wizard Handlers
        // Step 1: Channel
        if (customId === 'wizard_panel_channel' && interaction.isChannelSelectMenu()) {
            await handleWizardChannelSelect(interaction);
            return;
        }
        // Step 2: Type
        if (customId === 'wizard_panel_type_select' && interaction.isStringSelectMenu()) {
            await handleWizardTypeSelect(interaction);
            return;
        }
        // Step 3: Details Modal
        if (customId === 'wizard_panel_details_modal') {
            await handleWizardDetailsModal(interaction as ModalSubmitInteraction);
            return;
        }
        // Step 4a (Button): Style
        if (customId === 'wizard_panel_style' && interaction.isStringSelectMenu()) {
            await handleWizardStyleSelect(interaction);
            return;
        }
        // Step 4b (Select): Options Management
        if (customId === 'wizard_option_add') {
            await showOptionAddModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'wizard_option_remove') {
            await handleOptionRemove(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'wizard_option_finish') {
            const state = wizardStates.get(interaction.user.id);
            if (state) await showWizardPreview(interaction as ButtonInteraction, state);
            return;
        }
        if (customId === 'wizard_option_modal') {
            await handleOptionModalSubmit(interaction as ModalSubmitInteraction);
            return;
        }

        // Final Confirm
        if (customId === 'confirm_panel') {
            await handleWizardConfirm(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'cancel_panel') {
            wizardStates.delete(interaction.user.id);
            await showTicketMenu(interaction);
            return;
        }

    } catch (error) {
        logger.error(`[ConfigTickets] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}

// =========================================
// Simple Config Options
// =========================================

async function handleTicketConfigOption(interaction: StringSelectMenuInteraction, option: string) {
    if (option === 'set_staff') {
        const roleSelect = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('ticket_set_staff_role')
                .setPlaceholder('Selecione os cargos de staff...')
                .setMinValues(1)
                .setMaxValues(10)
        );

        const backBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('cancel_ticket_config')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        await (interaction as any).update({
            content: '🛡️ **Selecione os cargos de staff que poderão gerenciar tickets:**',
            embeds: [],
            components: [roleSelect, backBtn]
        });

    } else if (option === 'set_category' || option === 'set_logs' || option === 'set_rating') {
        const channelType = option === 'set_category' ? ChannelType.GuildCategory : ChannelType.GuildText;
        const placeholder = option === 'set_category'
            ? 'Selecione a categoria...'
            : option === 'set_logs'
                ? 'Selecione o canal de logs...'
                : 'Selecione o canal de avaliações...';

        const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`ticket_${option}`)
                .setPlaceholder(placeholder)
                .addChannelTypes(channelType)
        );

        const backBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('cancel_ticket_config')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        const title = option === 'set_category'
            ? '📁 **Selecione a categoria onde os tickets serão criados:**'
            : option === 'set_logs'
                ? '📋 **Selecione o canal para logs e transcripts:**'
                : '⭐ **Selecione o canal para avaliações:**';

        await (interaction as any).update({
            content: title,
            embeds: [],
            components: [channelSelect, backBtn]
        });
    }
}

async function handleStaffRoleSelect(interaction: RoleSelectMenuInteraction) {
    const roleIds = interaction.values;
    await TicketService.updateConfig(interaction.guildId!, { staffRoleIds: roleIds });
    await interaction.reply({
        content: `✅ Cargos de staff definidos: ${roleIds.map((id: string) => `<@&${id}>`).join(', ')}`,
        components: [],
        flags: MessageFlags.Ephemeral
    });

    setTimeout(() => showTicketMenu(interaction), 2000);
}

async function handleChannelSelect(interaction: ChannelSelectMenuInteraction) {
    const channelId = interaction.values[0];
    const updateData: any = {};
    const option = interaction.customId;

    if (option === 'ticket_set_category') updateData.defaultCategoryId = channelId;
    if (option === 'ticket_set_logs') updateData.logsChannelId = channelId;
    if (option === 'ticket_set_rating') updateData.ratingChannelId = channelId;

    await TicketService.updateConfig(interaction.guildId!, updateData);
    await interaction.reply({
        content: `✅ Configuração salva: <#${channelId}>`,
        components: [],
        flags: MessageFlags.Ephemeral
    });

    setTimeout(() => showTicketMenu(interaction), 2000);
}


// =========================================
// Wizard Implementation
// =========================================

async function startPanelWizard(interaction: StringSelectMenuInteraction) {
    // Reset state
    wizardStates.set(interaction.user.id, {
        options: []
    });

    const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('wizard_panel_channel')
            .setPlaceholder('Selecione o canal do painel...')
            .addChannelTypes(ChannelType.GuildText)
    );

    await (interaction as any).update({
        content: '✨ **Criador de Painel de Tickets (Passo 1/4)**\nSelecione o canal onde o painel será enviado:',
        embeds: [],
        components: [channelSelect]
    });
}

async function handleWizardChannelSelect(interaction: ChannelSelectMenuInteraction) {
    const state = wizardStates.get(interaction.user.id) || { options: [] };
    state.channelId = interaction.values[0];
    wizardStates.set(interaction.user.id, state);

    const typeSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('wizard_panel_type_select')
            .setPlaceholder('Selecione o tipo de painel...')
            .addOptions([
                { label: 'Botão Único', value: 'button', emoji: '🔘', description: 'Painel simples com um botão para abrir ticket' },
                { label: 'Menu de Seleção', value: 'select', emoji: '🔽', description: 'Painel com lista de categorias/opções' }
            ])
    );

    await (interaction as any).update({
        content: '✨ **Criador de Painel de Tickets (Passo 2/4)**\nEscolha como os usuários irão interagir com o painel:',
        components: [typeSelect]
    });
}

async function handleWizardTypeSelect(interaction: StringSelectMenuInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state) return;

    state.type = interaction.values[0] as 'button' | 'select';
    wizardStates.set(interaction.user.id, state);

    // Show Modal based on type
    const modal = new ModalBuilder()
        .setCustomId('wizard_panel_details_modal')
        .setTitle('Detalhes do Painel');

    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Título do Painel')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Central de Suporte')
        .setRequired(true);

    const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Descrição')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: Selecione uma opção abaixo...')
        .setRequired(true);

    // Dynamic inputs based on type
    if (state.type === 'button') {
        const btnTextInput = new TextInputBuilder()
            .setCustomId('button_text')
            .setLabel('Texto do Botão')
            .setStyle(TextInputStyle.Short)
            .setValue('Abrir Ticket')
            .setRequired(true);

        const btnEmojiInput = new TextInputBuilder()
            .setCustomId('button_emoji')
            .setLabel('Emoji do Botão')
            .setStyle(TextInputStyle.Short)
            .setValue('📩')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(btnTextInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(btnEmojiInput)
        );
    } else {
        const placeholderInput = new TextInputBuilder()
            .setCustomId('placeholder')
            .setLabel('Placeholder do Menu')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Escolha o departamento...')
            .setValue('Selecione uma opção...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(placeholderInput)
        );
    }

    await interaction.showModal(modal);
}

async function handleWizardDetailsModal(interaction: ModalSubmitInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state) {
        await interaction.reply({ content: '❌ Sessão expirada.', flags: MessageFlags.Ephemeral });
        return;
    }

    state.title = interaction.fields.getTextInputValue('title');
    state.description = interaction.fields.getTextInputValue('description');

    if (state.type === 'button') {
        state.buttonText = interaction.fields.getTextInputValue('button_text');
        state.buttonEmoji = interaction.fields.getTextInputValue('button_emoji');
        state.buttonStyle = ButtonStyle.Primary; // Default

        wizardStates.set(interaction.user.id, state);
        await showWizardPreview(interaction, state);
    } else {
        state.placeholder = interaction.fields.getTextInputValue('placeholder');

        wizardStates.set(interaction.user.id, state);
        await showOptionManager(interaction, state);
    }
}

// Button Specific Flow
async function handleWizardStyleSelect(interaction: StringSelectMenuInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state) return;

    state.buttonStyle = parseInt(interaction.values[0]);
    wizardStates.set(interaction.user.id, state);

    await showWizardPreview(interaction, state);
}

// Select Specific Flow
async function showOptionManager(interaction: ModalSubmitInteraction | ButtonInteraction, state: WizardState) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setTitle('⚙️ Gerenciador de Opções')
        .setDescription(`Configure as opções que aparecerão no menu de seleção.\n\n**Opções Atuais:**\n${state.options.length > 0 ? state.options.map((opt, i) => `${i + 1}. ${opt.emoji || ''} **${opt.label}** - ${opt.description || ''}`).join('\n') : '*Nenhuma opção adicionada*'}`);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('wizard_option_add').setLabel('Adicionar Opção').setStyle(ButtonStyle.Primary).setEmoji('➕'),
        new ButtonBuilder().setCustomId('wizard_option_remove').setLabel('Remover Última').setStyle(ButtonStyle.Danger).setEmoji('🗑️').setDisabled(state.options.length === 0),
        new ButtonBuilder().setCustomId('wizard_option_finish').setLabel('Finalizar e Visualizar').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(state.options.length === 0)
    );

    const payload = {
        content: '✨ **Criador de Painel (Passo 3/4)**\nAdicione pelo menos uma opção para continuar.',
        embeds: [embed],
        components: [buttons]
    };

    if (interaction.isModalSubmit()) {
        await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    } else {
        await (interaction as any).update(payload);
    }
}

async function showOptionAddModal(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId('wizard_option_modal')
        .setTitle('Adicionar Opção');

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('opt_label').setLabel('Nome da Opção').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('opt_desc').setLabel('Descrição (Opcional)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('opt_emoji').setLabel('Emoji (Opcional)').setStyle(TextInputStyle.Short).setRequired(false)
        )
    );

    await interaction.showModal(modal);
}

async function handleOptionModalSubmit(interaction: ModalSubmitInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state) return;

    state.options.push({
        label: interaction.fields.getTextInputValue('opt_label'),
        description: interaction.fields.getTextInputValue('opt_desc'),
        emoji: interaction.fields.getTextInputValue('opt_emoji')
    });

    wizardStates.set(interaction.user.id, state);
    await showOptionManager(interaction, state);
}

async function handleOptionRemove(interaction: ButtonInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state) return;

    state.options.pop();
    wizardStates.set(interaction.user.id, state);
    await showOptionManager(interaction, state);
}


// Shared Final Steps
async function showWizardPreview(interaction: ModalSubmitInteraction | ButtonInteraction | StringSelectMenuInteraction, state: WizardState) {
    const previewEmbed = new EmbedBuilder()
        .setTitle(state.title || 'Título')
        .setDescription(state.description || 'Descrição')
        .setColor(EMBED_COLORS.INFO);

    if (state.bannerUrl) previewEmbed.setImage(state.bannerUrl);

    let components: ActionRowBuilder<any>[] = [];

    if (state.type === 'button') {
        const previewBtn = new ButtonBuilder()
            .setCustomId('preview')
            .setLabel(state.buttonText || 'Botão')
            .setEmoji(state.buttonEmoji || '📩')
            .setStyle(state.buttonStyle || ButtonStyle.Primary)
            .setDisabled(true);

        const styleSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('wizard_panel_style')
                .setPlaceholder('Estilo do Botão')
                .addOptions([
                    { label: 'Azul (Primary)', value: ButtonStyle.Primary.toString(), emoji: '🔵' },
                    { label: 'Cinza (Secondary)', value: ButtonStyle.Secondary.toString(), emoji: '⚪' },
                    { label: 'Verde (Success)', value: ButtonStyle.Success.toString(), emoji: '🟢' },
                    { label: 'Vermelho (Danger)', value: ButtonStyle.Danger.toString(), emoji: '🔴' }
                ])
        );

        components.push(new ActionRowBuilder().addComponents(previewBtn));
        if (!interaction.isStringSelectMenu()) components.push(styleSelect); // Don't show style select if just updating style
    } else {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('preview')
            .setPlaceholder(state.placeholder || 'Selecione...')
            .setDisabled(true);

        state.options.forEach(opt => {
            selectMenu.addOptions({
                label: opt.label,
                description: opt.description,
                emoji: opt.emoji,
                value: opt.label // dummy
            });
        });

        components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('confirm_panel').setLabel('Confirmar e Enviar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_panel').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
    );
    components.push(confirmRow);

    const payload = {
        content: '👀 **Pré-visualização do Painel**\nConfira se está tudo correto:',
        embeds: [previewEmbed],
        components: components
    };

    if (interaction.isModalSubmit() || interaction.isButton()) { // Button from option manager
        if (interaction.deferred || interaction.replied) await (interaction as any).editReply(payload);
        else await (interaction as any).update(payload);
    } else {
        await (interaction as any).update(payload);
    }
}

async function handleWizardConfirm(interaction: ButtonInteraction) {
    const state = wizardStates.get(interaction.user.id);
    if (!state || !state.channelId) {
        await interaction.reply({ content: '❌ Erro de estado.', flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        const panel = await TicketService.createPanel(interaction.guildId!, {
            channelId: state.channelId,
            title: state.title!,
            description: state.description!,
            type: state.type || 'button',
            placeholder: state.placeholder,
            options: state.type === 'button'
                ? [{ label: state.buttonText!, emoji: state.buttonEmoji, style: state.buttonStyle }]
                : state.options
        });

        // Send panel message
        const channel = interaction.guild!.channels.cache.get(state.channelId);
        if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setTitle(state.title || 'Painel')
                .setDescription(state.description || 'Abra um ticket')
                .setColor(EMBED_COLORS.INFO);

            let componentRow: ActionRowBuilder<any>;

            if (state.type === 'button') {
                componentRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_open_${panel.id}_default`) // Use specific ID for single option
                        .setLabel(state.buttonText!)
                        .setEmoji(state.buttonEmoji || '📩')
                        .setStyle(state.buttonStyle!)
                );
            } else {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`ticket_open_${panel.id}`)
                    .setPlaceholder(state.placeholder || 'Selecione...');

                // We need to fetch panel again or use the options we just formatted?
                // Actually ticketService formats them with IDs. Ideally we should use those IDs.
                // But simplified: TicketService returns the panel with formatted options.
                const createdPanel = panel; // It is the created object
                const options = createdPanel.options as any[];

                options.forEach(opt => {
                    selectMenu.addOptions({
                        label: opt.label,
                        description: opt.description,
                        emoji: opt.emoji,
                        value: opt.id // Use the generated ID
                    });
                });

                componentRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            }

            const msg = await channel.send({ embeds: [embed], components: [componentRow] });

            // Update panel with messageId
            await TicketService.updatePanelMessageId(panel.id, msg.id);
        }

        await (interaction as any).update({ content: `✅ Painel criado com sucesso em <#${state.channelId}>!`, components: [], embeds: [] });
        wizardStates.delete(interaction.user.id);

        setTimeout(() => showTicketMenu(interaction), 2000);

    } catch (error) {
        logger.error('[Wizard] Erro ao criar painel:', error);
        await interaction.reply({ content: '❌ Erro ao criar painel.', flags: MessageFlags.Ephemeral });
    }
}
