/**
 * Config Module: Profile
 * Configurações de Perfil
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
import { createConfigEmbed, createBackButton, createMultiFieldModal, updateConfigField, successMessage, errorMessage, safeRespond } from './shared.js';
const FILENAME = 'profile.yml';
/**
 * Menu Principal de Perfil
 */
export async function showProfileMenu(interaction, backHandler) {
    try {
        const config = ConfigService.getConfig(FILENAME);
        const embed = createConfigEmbed('👤 Configurações de Perfil', '🎨', 'Configure os padrões e comportamentos dos perfis de usuário.');
        const defaults = config.defaults || {};
        const ignoredRoles = config.ignored_roles || [];
        const starboardChannel = config.starboard?.channel_id ? `<#${config.starboard.channel_id}>` : '❌ Não Configurado';
        embed.addFields({ name: 'Sobre Mim Padrão', value: defaults.about_me ? `"${defaults.about_me}"` : 'Nenhum', inline: false }, { name: 'Cor Padrão', value: defaults.color || 'Padrão Discord', inline: true }, { name: 'Cargos Ignorados', value: `${ignoredRoles.length} cargos`, inline: true }, { name: 'Canal do StarBoard', value: starboardChannel, inline: false });
        const buttons = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId('config_profile_edit_defaults')
            .setLabel('Editar Padrões')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'), new ButtonBuilder()
            .setCustomId('config_profile_edit_roles')
            .setLabel('Gerenciar Cargos Ignorados')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛡️'));
        const starboardRow = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder()
            .setCustomId('config_profile_set_starboard')
            .setPlaceholder('Selecione o canal de destaque do StarBoard...')
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement));
        const backRow = new ActionRowBuilder().addComponents(createBackButton('config_back_to_main'));
        await safeRespond(interaction, { embeds: [embed], components: [buttons, starboardRow, backRow] });
    }
    catch (error) {
        logger.error('[ConfigProfile] Erro em showProfileMenu:', error);
    }
}
/**
 * Handler Central para Interações de Perfil
 */
export async function handleProfileInteraction(interaction) {
    const customId = interaction.customId;
    try {
        if (customId === 'config_profile_back')
            return await showProfileMenu(interaction);
        if (customId === 'config_profile_edit_defaults') {
            await showProfileDefaultsModal(interaction);
            return;
        }
        if (customId === 'config_profile_roles_modal') {
            await handleProfileDefaultsModal(interaction);
            return;
        }
        if (customId === 'config_profile_edit_roles') {
            await showIgnoredRolesSelector(interaction);
            return;
        }
        if (customId === 'config_profile_set_ignored_roles' && interaction.isRoleSelectMenu()) {
            await handleIgnoredRolesSelect(interaction);
            return;
        }
        if (customId === 'config_profile_set_starboard' && interaction.isChannelSelectMenu()) {
            await handleStarboardSelect(interaction);
            return;
        }
    }
    catch (error) {
        logger.error(`[ConfigProfile] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}
async function showProfileDefaultsModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const defaults = config.defaults || {};
    const modal = createMultiFieldModal('config_profile_roles_modal', 'Padrões de Perfil', [
        {
            id: 'about_me',
            label: 'Sobre Mim Padrão',
            value: defaults.about_me || '',
            placeholder: 'Um cidadão de TDR...',
            maxLength: 500
        },
        {
            id: 'color',
            label: 'Cor Hex Padrão',
            value: defaults.color || '',
            placeholder: '#5865F2'
        }
    ]);
    await interaction.showModal(modal);
}
async function handleProfileDefaultsModal(interaction) {
    const aboutMe = interaction.fields.getTextInputValue('about_me');
    const color = interaction.fields.getTextInputValue('color');
    await updateConfigField(FILENAME, 'defaults.about_me', aboutMe, interaction.user.id);
    const colorResult = await updateConfigField(FILENAME, 'defaults.color', color, interaction.user.id);
    if (colorResult.success) {
        await interaction.reply({ content: successMessage('Padrões de perfil atualizados!'), flags: MessageFlags.Ephemeral });
    }
    else {
        await interaction.reply({ content: errorMessage(`Erro na cor: ${colorResult.error}`), flags: MessageFlags.Ephemeral });
    }
}
async function showIgnoredRolesSelector(interaction) {
    const roleSelect = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder()
        .setCustomId('config_profile_set_ignored_roles')
        .setPlaceholder('Selecione cargos para ignorar no perfil...')
        .setMinValues(0)
        .setMaxValues(25) // Discord limit
    );
    const backRow = new ActionRowBuilder().addComponents(createBackButton('config_profile_back'));
    const embed = createConfigEmbed('🛡️ Cargos Ignorados', '🚫', 'Selecione os cargos que não devem aparecer como "Cargo Mais Alto" no perfil (ex: cores, separadores).');
    await safeRespond(interaction, { embeds: [embed], components: [roleSelect, backRow] });
}
async function handleIgnoredRolesSelect(interaction) {
    const roles = interaction.values;
    await updateConfigField(FILENAME, 'ignored_roles', roles, interaction.user.id);
    await interaction.reply({ content: successMessage(`Lista de cargos ignorados atualizada (${roles.length} cargos)!`), flags: MessageFlags.Ephemeral });
}
async function handleStarboardSelect(interaction) {
    const channelId = interaction.values[0];
    await updateConfigField(FILENAME, 'starboard.channel_id', channelId, interaction.user.id);
    // Refresh menu silently using safeRespond abstraction from shared
    await showProfileMenu(interaction);
}
//# sourceMappingURL=profile.js.map