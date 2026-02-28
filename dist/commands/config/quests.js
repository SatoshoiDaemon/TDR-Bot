/**
 * Config Module: Quests
 * Configurações de Missões Diárias
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, MessageFlags } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
import { createConfigEmbed, createBackButton, createMultiFieldModal, updateConfigField, successMessage, errorMessage, safeRespond } from './shared.js';
const FILENAME = 'quests.yml';
/**
 * Menu Principal de Quests
 */
export async function showQuestsMenu(interaction, backHandler) {
    try {
        const config = ConfigService.getConfig(FILENAME);
        const embed = createConfigEmbed('📜 Configurações de Missões', '⚔️', 'Gerencie o sistema de Daily Quests.');
        const rewards = config.rewards || { money_multiplier: 1, xp_multiplier: 1 };
        const playerRoles = config.player_roles || [];
        embed.addFields({ name: 'Missões por Dia', value: `${config.quests_per_day}`, inline: true }, { name: 'Mult. Dracmas', value: `${rewards.money_multiplier}x`, inline: true }, { name: 'Mult. XP', value: `${rewards.xp_multiplier}x`, inline: true }, { name: 'Cargos Permitidos', value: playerRoles.length > 0 ? `${playerRoles.length} cargos` : 'Todos', inline: false });
        const buttons = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId('config_quests_edit_general')
            .setLabel('Editar Configs Gerais')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'), new ButtonBuilder()
            .setCustomId('config_quests_edit_roles')
            .setLabel('Restringir Cargos')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛡️'));
        const backRow = new ActionRowBuilder().addComponents(createBackButton('config_back_to_main'));
        await safeRespond(interaction, { embeds: [embed], components: [buttons, backRow] });
    }
    catch (error) {
        logger.error('[ConfigQuests] Erro em showQuestsMenu:', error);
    }
}
/**
 * Handler Central para Interações de Quests
 */
export async function handleQuestsInteraction(interaction) {
    const customId = interaction.customId;
    try {
        if (customId === 'config_quests_back')
            return await showQuestsMenu(interaction);
        if (customId === 'config_quests_edit_general') {
            await showQuestsGeneralModal(interaction);
            return;
        }
        if (customId === 'config_quests_general_modal') {
            await handleQuestsGeneralModal(interaction);
            return;
        }
        if (customId === 'config_quests_edit_roles') {
            await showPlayerRolesSelector(interaction);
            return;
        }
        if (customId === 'config_quests_set_roles' && interaction.isRoleSelectMenu()) {
            await handlePlayerRolesSelect(interaction);
            return;
        }
    }
    catch (error) {
        logger.error(`[ConfigQuests] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}
async function showQuestsGeneralModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const rewards = config.rewards || {};
    const modal = createMultiFieldModal('config_quests_general_modal', 'Jornada do Herói', [
        {
            id: 'quests_per_day',
            label: 'Missões por Dia (1-10)',
            value: String(config.quests_per_day || 3),
            placeholder: '3',
            maxLength: 2
        },
        {
            id: 'money_mult',
            label: 'Multiplicador de Dracmas',
            value: String(rewards.money_multiplier || 1.0),
            placeholder: '1.0'
        },
        {
            id: 'xp_mult',
            label: 'Multiplicador de XP',
            value: String(rewards.xp_multiplier || 1.0),
            placeholder: '1.0'
        }
    ]);
    await interaction.showModal(modal);
}
async function handleQuestsGeneralModal(interaction) {
    const qpd = parseFloat(interaction.fields.getTextInputValue('quests_per_day'));
    const money = parseFloat(interaction.fields.getTextInputValue('money_mult'));
    const xp = parseFloat(interaction.fields.getTextInputValue('xp_mult'));
    if (isNaN(qpd) || isNaN(money) || isNaN(xp)) {
        await interaction.reply({ content: errorMessage('Valores inválidos. Use apenas números.'), flags: MessageFlags.Ephemeral });
        return;
    }
    await updateConfigField(FILENAME, 'quests_per_day', qpd, interaction.user.id);
    await updateConfigField(FILENAME, 'rewards.money_multiplier', money, interaction.user.id);
    await updateConfigField(FILENAME, 'rewards.xp_multiplier', xp, interaction.user.id);
    await interaction.reply({ content: successMessage('Configurações de missões atualizadas!'), flags: MessageFlags.Ephemeral });
}
async function showPlayerRolesSelector(interaction) {
    const roleSelect = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder()
        .setCustomId('config_quests_set_roles')
        .setPlaceholder('Selecione cargos permitidos (Vazio = Todos)...')
        .setMinValues(0)
        .setMaxValues(25));
    const backRow = new ActionRowBuilder().addComponents(createBackButton('config_quests_back'));
    const embed = createConfigEmbed('🛡️ Restrição de Cargos', '🔒', 'Apenas membros com estes cargos receberão missões diárias. Deixe vazio para permitir todos.');
    await safeRespond(interaction, { embeds: [embed], components: [roleSelect, backRow] });
}
async function handlePlayerRolesSelect(interaction) {
    const roles = interaction.values;
    await updateConfigField(FILENAME, 'player_roles', roles, interaction.user.id);
    await interaction.reply({ content: successMessage(`Lista de cargos permitidos atualizada (${roles.length} cargos)!`), flags: MessageFlags.Ephemeral });
}
//# sourceMappingURL=quests.js.map