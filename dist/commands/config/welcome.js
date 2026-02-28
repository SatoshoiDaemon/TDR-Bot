/**
 * Config Module: Welcome (Boas-vindas)
 * Configurações de entrada de novos membros
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
import { createConfigEmbed, createBackButton, createToggleButton, createMultiFieldModal, updateConfigField, successMessage, errorMessage, safeRespond } from './shared.js';
const FILENAME = 'welcome.yml';
/**
 * Menu principal de Boas-vindas
 */
export async function showWelcomeMenu(interaction, backHandler) {
    try {
        const config = ConfigService.getConfig(FILENAME);
        const embed = createConfigEmbed('Configurações de Boas-vindas', '👋', 'Configure as mensagens e cargos para novos membros.');
        const dmMessage = config.dm_message || { enabled: true, use_embed: true };
        const initialRoles = config.initial_roles || [];
        embed.addFields({ name: '📊 Sistema', value: config.enabled ? '✅ Ativo' : '❌ Inativo', inline: true }, { name: '📩 Mensagem DM', value: dmMessage.enabled ? '✅ Ativa' : '❌ Inativa', inline: true }, { name: '🖼️ Usar Embed', value: dmMessage.use_embed ? '✅' : '❌', inline: true }, { name: '👥 Cargos Iniciais', value: initialRoles.length > 0 ? `${initialRoles.length} cargos` : 'Nenhum', inline: true });
        if (dmMessage.content) {
            embed.addFields({
                name: '💬 Mensagem',
                value: dmMessage.content.substring(0, 200) + (dmMessage.content.length > 200 ? '...' : ''),
                inline: false
            });
        }
        if (dmMessage.embed) {
            embed.addFields({ name: '📝 Título do Embed', value: dmMessage.embed.title || 'Padrão', inline: true }, { name: '🎨 Cor', value: dmMessage.embed.color || '#5865F2', inline: true });
        }
        const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_welcome_toggle', config.enabled, 'Desativar', 'Ativar'), createToggleButton('config_welcome_dm_toggle', dmMessage.enabled, 'Desativar DM', 'Ativar DM'), createToggleButton('config_welcome_embed_toggle', dmMessage.use_embed, 'Sem Embed', 'Com Embed'), new ButtonBuilder()
            .setCustomId('config_welcome_edit')
            .setLabel('Editar Mensagem')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'));
        const backRow = new ActionRowBuilder().addComponents(createBackButton('config_back_to_main'));
        await safeRespond(interaction, { embeds: [embed], components: [buttons, backRow] });
    }
    catch (error) {
        logger.error('[ConfigWelcome] Erro em showWelcomeMenu:', error);
    }
}
/**
 * Handler Central para Interações de Welcome
 */
export async function handleWelcomeInteraction(interaction) {
    const customId = interaction.customId;
    try {
        if (customId === 'config_welcome_back')
            return await showWelcomeMenu(interaction); // Alias if needed
        if (customId === 'config_welcome_toggle') {
            await toggleWelcome(interaction);
            return;
        }
        if (customId === 'config_welcome_dm_toggle') {
            await toggleWelcomeDM(interaction);
            return;
        }
        if (customId === 'config_welcome_embed_toggle') {
            await toggleWelcomeEmbed(interaction);
            return;
        }
        if (customId === 'config_welcome_edit') {
            await showWelcomeEditModal(interaction);
            return;
        }
        if (customId === 'config_welcome_modal') {
            await handleWelcomeEditModal(interaction);
            return;
        }
    }
    catch (error) {
        logger.error(`[ConfigWelcome] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}
async function toggleWelcome(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    await updateConfigField(FILENAME, 'enabled', !config.enabled, interaction.user.id);
    await showWelcomeMenu(interaction);
}
async function toggleWelcomeDM(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const enabled = config.dm_message?.enabled ?? true;
    await updateConfigField(FILENAME, 'dm_message.enabled', !enabled, interaction.user.id);
    await showWelcomeMenu(interaction);
}
async function toggleWelcomeEmbed(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const useEmbed = config.dm_message?.use_embed ?? true;
    await updateConfigField(FILENAME, 'dm_message.use_embed', !useEmbed, interaction.user.id);
    await showWelcomeMenu(interaction);
}
async function showWelcomeEditModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const dmMessage = config.dm_message || {};
    const modal = createMultiFieldModal('config_welcome_modal', 'Editar Boas-vindas', [
        {
            id: 'content',
            label: 'Mensagem ({user}, {server})',
            value: dmMessage.content || '',
            placeholder: 'Olá {user}, bem-vindo ao {server}!',
            maxLength: 2000
        },
        {
            id: 'title',
            label: 'Título do Embed',
            value: dmMessage.embed?.title || '',
            placeholder: 'Bem-vindo!'
        },
        {
            id: 'description',
            label: 'Descrição do Embed',
            value: dmMessage.embed?.description || '',
            placeholder: 'Descrição de boas-vindas...',
            maxLength: 2000
        },
        {
            id: 'color',
            label: 'Cor do Embed (#HEX)',
            value: dmMessage.embed?.color || '#5865F2',
            placeholder: '#5865F2'
        }
    ]);
    await interaction.showModal(modal);
}
async function handleWelcomeEditModal(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const content = interaction.fields.getTextInputValue('content');
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const color = interaction.fields.getTextInputValue('color');
    await updateConfigField(FILENAME, 'dm_message.content', content, interaction.user.id);
    await updateConfigField(FILENAME, 'dm_message.embed.title', title, interaction.user.id);
    await updateConfigField(FILENAME, 'dm_message.embed.description', description, interaction.user.id);
    const colorResult = await updateConfigField(FILENAME, 'dm_message.embed.color', color, interaction.user.id);
    if (!colorResult.success) {
        await interaction.editReply({ content: errorMessage(`Cor inválida: ${colorResult.error}`) });
    }
    else {
        await interaction.editReply({ content: successMessage('Mensagem de boas-vindas atualizada!') });
    }
}
//# sourceMappingURL=welcome.js.map