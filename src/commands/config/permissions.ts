/**
 * Config Module: Permissions
 * Configurações de Permissões e Staff
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type MessageComponentInteraction,
    type ButtonInteraction,
    type ModalSubmitInteraction,
    RoleSelectMenuBuilder,
    type RoleSelectMenuInteraction,
    UserSelectMenuBuilder,
    type UserSelectMenuInteraction
    ,
    MessageFlags
} from 'discord.js';
import { ConfigService } from '@services/configService.js';
import { logger } from '@shared/logger.js';
import type { PermissionsConfig } from '../../types/configs/permissions.js';
import {
    createConfigEmbed,
    createBackButton,
    updateConfigField,
    successMessage,
    errorMessage,
    safeRespond
} from './shared.js';

const FILENAME = 'permissions.yml';

/**
 * Menu Principal de Permissões
 */
export async function showPermissionsMenu(
    interaction: any,
    backHandler?: any
) {
    try {
        const config = ConfigService.getConfig<PermissionsConfig>(FILENAME);

        const embed = createConfigEmbed(
            '🛡️ Configurações de Permissões',
            '🔑',
            'Gerencie quem tem acesso aos comandos de moderação do bot.'
        );

        const staffRoles = config.staff_level_roles || [];
        const staffMembers = config.staff_members || [];

        embed.addFields(
            { name: 'Permissão Base', value: `\`${config.staff_level_permission || 'ManageRoles'}\``, inline: true },
            { name: 'Cargos Staff', value: `${staffRoles.length} cargos`, inline: true },
            { name: 'Membros Staff', value: `${staffMembers.length} membros`, inline: true }
        );

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('config_perms_edit_roles')
                .setLabel('Gerenciar Cargos Staff')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👔'),
            new ButtonBuilder()
                .setCustomId('config_perms_edit_members')
                .setLabel('Gerenciar Membros Staff')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👤')
        );

        const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createBackButton('config_back_to_main')
        );

        await safeRespond(interaction, { embeds: [embed], components: [buttons, backRow] });
    } catch (error) {
        logger.error('[ConfigPerms] Erro em showPermissionsMenu:', error);
    }
}

/**
 * Handler Central para Interações de Permissões
 */
export async function handlePermissionsInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const customId = interaction.customId;

    try {
        if (customId === 'config_perms_back') return await showPermissionsMenu(interaction);

        if (customId === 'config_perms_edit_roles') {
            await showStaffRolesSelector(interaction as ButtonInteraction);
            return;
        }

        if (customId === 'config_perms_set_roles' && interaction.isRoleSelectMenu()) {
            await handleStaffRolesSelect(interaction);
            return;
        }

        if (customId === 'config_perms_edit_members') {
            await showStaffMembersSelector(interaction as ButtonInteraction);
            return;
        }

        if (customId === 'config_perms_set_members' && interaction.isUserSelectMenu()) {
            await handleStaffMembersSelect(interaction);
            return;
        }

    } catch (error) {
        logger.error(`[ConfigPerms] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showStaffRolesSelector(interaction: ButtonInteraction) {
    const roleSelect = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('config_perms_set_roles')
            .setPlaceholder('Selecione cargos de staff...')
            .setMinValues(0)
            .setMaxValues(25)
    );

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_perms_back')
    );

    const embed = createConfigEmbed(
        '👔 Cargos de Staff',
        '🛡️',
        'Membros com estes cargos terão acesso total aos comandos de moderação.'
    );

    await safeRespond(interaction, { embeds: [embed], components: [roleSelect, backRow] });
}

async function handleStaffRolesSelect(interaction: RoleSelectMenuInteraction) {
    const roles = interaction.values;
    await updateConfigField(FILENAME, 'staff_level_roles', roles, interaction.user.id);

    await interaction.reply({
        content: successMessage(`Lista de cargos staff atualizada (${roles.length} cargos)!`),
        embeds: [],
        components: [],
        flags: MessageFlags.Ephemeral
    });

    setTimeout(() => showPermissionsMenu(interaction), 2000);
}

async function showStaffMembersSelector(interaction: ButtonInteraction) {
    const userSelect = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('config_perms_set_members')
            .setPlaceholder('Selecione membros staff...')
            .setMinValues(0)
            .setMaxValues(25)
    );

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_perms_back')
    );

    const embed = createConfigEmbed(
        '👤 Membros Staff',
        '🛡️',
        'Estes membros terão acesso total aos comandos de moderação, independente de cargos.'
    );

    await safeRespond(interaction, { embeds: [embed], components: [userSelect, backRow] });
}

async function handleStaffMembersSelect(interaction: UserSelectMenuInteraction) {
    const members = interaction.values;
    await updateConfigField(FILENAME, 'staff_members', members, interaction.user.id);

    await interaction.reply({
        content: successMessage(`Lista de membros staff atualizada (${members.length} membros)!`),
        embeds: [],
        components: [],
        flags: MessageFlags.Ephemeral
    });

    setTimeout(() => showPermissionsMenu(interaction), 2000);
}
