/**
 * Config Module: Inactivity
 * Configurações de Membros Inativos
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, MessageFlags } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
import { createConfigEmbed, createBackButton, createToggleButton, createMultiFieldModal, updateConfigField, successMessage, errorMessage, safeRespond } from './shared.js';
const FILENAME = 'inactivity.yml';
/**
 * Menu Principal de Inatividade
 */
export async function showInactivityMenu(interaction, backHandler) {
    try {
        const config = ConfigService.getConfig(FILENAME);
        const embed = createConfigEmbed('💤 Configurações de Inatividade', '😴', 'Gerencie como o bot lida com membros inativos.');
        embed.addFields({ name: 'Sistema Geral', value: config.enabled ? '✅ Ativo' : '❌ Inativo', inline: true }, { name: 'Dias para Inatividade', value: `${config.inactive_days} dias`, inline: true }, { name: 'Canal de Notificação', value: config.notification_channel_id ? `<#${config.notification_channel_id}>` : '❌ Não definido', inline: false });
        if (config.message?.content) {
            embed.addFields({
                name: 'Mensagem',
                value: config.message.content.substring(0, 200) + (config.message.content.length > 200 ? '...' : ''),
                inline: false
            });
        }
        const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_inactivity_toggle', config.enabled, 'Desativar Sistema', 'Ativar Sistema'), new ButtonBuilder()
            .setCustomId('config_inactivity_edit_msg')
            .setLabel('Editar Mensagem')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'), new ButtonBuilder()
            .setCustomId('config_inactivity_set_days')
            .setLabel('Alterar Dias')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📅'));
        const channelSelect = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder()
            .setCustomId('config_inactivity_channel')
            .setPlaceholder('Selecione o canal de notificações...')
            .addChannelTypes(ChannelType.GuildText));
        const backRow = new ActionRowBuilder().addComponents(createBackButton('config_back_to_main'));
        await safeRespond(interaction, { embeds: [embed], components: [buttons, channelSelect, backRow] });
    }
    catch (error) {
        logger.error('[ConfigInactivity] Erro em showInactivityMenu:', error);
    }
}
/**
 * Handler Central para Interações de Inatividade
 */
export async function handleInactivityInteraction(interaction) {
    const customId = interaction.customId;
    try {
        if (customId === 'config_inactivity_back')
            return await showInactivityMenu(interaction);
        if (customId === 'config_inactivity_toggle') {
            await toggleInactivitySystem(interaction);
            return;
        }
        if (customId === 'config_inactivity_channel' && interaction.isChannelSelectMenu()) {
            await updateInactivityChannel(interaction);
            return;
        }
        if (customId === 'config_inactivity_edit_msg') {
            await showInactivityMsgModal(interaction);
            return;
        }
        if (customId === 'config_inactivity_set_days') {
            await showInactivityDaysModal(interaction);
            return;
        }
        if (customId === 'config_inactivity_msg_modal') {
            await handleInactivityMsgModal(interaction);
            return;
        }
        if (customId === 'config_inactivity_days_modal') {
            await handleInactivityDaysModal(interaction);
            return;
        }
    }
    catch (error) {
        logger.error(`[ConfigInactivity] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}
async function toggleInactivitySystem(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    await updateConfigField(FILENAME, 'enabled', !config.enabled, interaction.user.id);
    await showInactivityMenu(interaction);
}
async function updateInactivityChannel(interaction) {
    const channelId = interaction.values[0];
    await updateConfigField(FILENAME, 'notification_channel_id', channelId, interaction.user.id);
    await showInactivityMenu(interaction);
}
async function showInactivityMsgModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const msg = config.message || {};
    const modal = createMultiFieldModal('config_inactivity_msg_modal', 'Editar Mensagem de Inatividade', [
        {
            id: 'content',
            label: 'Mensagem ({user}, {server})',
            value: msg.content || '',
            placeholder: 'Olá {user}, sentimos sua falta...',
            maxLength: 2000
        },
        {
            id: 'title',
            label: 'Título do Embed',
            value: msg.embed?.title || '',
            placeholder: 'Título'
        },
        {
            id: 'description',
            label: 'Descrição do Embed',
            value: msg.embed?.description || '',
            placeholder: 'Descrição...',
            maxLength: 2000
        }
    ]);
    await interaction.showModal(modal);
}
async function handleInactivityMsgModal(interaction) {
    const content = interaction.fields.getTextInputValue('content');
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    await updateConfigField(FILENAME, 'message.content', content, interaction.user.id);
    await updateConfigField(FILENAME, 'message.embed.title', title, interaction.user.id);
    await updateConfigField(FILENAME, 'message.embed.description', description, interaction.user.id);
    await interaction.reply({ content: successMessage('Mensagem de inatividade atualizada!'), flags: MessageFlags.Ephemeral });
}
async function showInactivityDaysModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const modal = createMultiFieldModal('config_inactivity_days_modal', 'Definir Dias de Inatividade', [
        {
            id: 'days',
            label: 'Dias sem enviar mensagens',
            value: String(config.inactive_days || 14),
            placeholder: '14',
            maxLength: 3
        }
    ]);
    await interaction.showModal(modal);
}
async function handleInactivityDaysModal(interaction) {
    const daysStr = interaction.fields.getTextInputValue('days');
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1) {
        await interaction.reply({ content: errorMessage('Por favor, insira um número válido de dias.'), flags: MessageFlags.Ephemeral });
        return;
    }
    const result = await updateConfigField(FILENAME, 'inactive_days', days, interaction.user.id);
    if (result.success) {
        await interaction.reply({ content: successMessage(`Dias de inatividade atualizado para ${days}!`), flags: MessageFlags.Ephemeral });
    }
    else {
        await interaction.reply({ content: errorMessage(`Erro: ${result.error}`), flags: MessageFlags.Ephemeral });
    }
}
//# sourceMappingURL=inactivity.js.map