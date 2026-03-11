/**
 * Config Module: Leveling
 * Configurações de XP, level up, recompensas e fórmulas
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type MessageComponentInteraction,
    type ButtonInteraction,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction
    ,
    MessageFlags
} from 'discord.js';
import { ConfigService } from '@services/configService.js';
import { logger } from '@shared/logger.js';
import type { LevelingConfig } from '../../types/configs/leveling.js';
import {
    createConfigEmbed,
    createBackButton,
    createToggleButton,
    createSubcategoryMenu,
    createMultiFieldModal,
    updateConfigField,
    successMessage,
    errorMessage,
    safeRespond
} from './shared.js';

const FILENAME = 'leveling.yml';

/**
 * Menu principal de Leveling
 */
export async function showLevelingMenu(
    interaction: any,
    backHandler?: any
) {
    try {
        const config = ConfigService.getConfig<LevelingConfig>(FILENAME);

        const embed = createConfigEmbed(
            'Configurações de Leveling',
            '✨',
            'Configure o sistema de experiência e níveis.\n\n' +
            '**📊 Status Atual:**'
        );

        const xp = config.xp_settings || { min_xp: 15, max_xp: 25, cooldown: 60 };
        const levelUp = config.level_up_message || { enabled: true };

        embed.addFields(
            { name: '📈 XP por Mensagem', value: `${xp.min_xp} - ${xp.max_xp}`, inline: true },
            { name: '⏰ Cooldown', value: `${xp.cooldown}s`, inline: true },
            { name: '📢 Mensagem de Level Up', value: levelUp.enabled ? '✅ Ativa' : '❌ Inativa', inline: true }
        );

        const menu = createSubcategoryMenu('config_leveling_submenu', 'Selecione uma subcategoria...', [
            { label: 'XP Settings', value: 'xp', description: 'Ganho de XP, cooldown e canais', emoji: '📈' },
            { label: 'Mensagem de Level Up', value: 'levelup', description: 'Configurar mensagem e embed', emoji: '📢' },
            { label: 'Fórmula de XP', value: 'formula', description: 'Curva de progressão de níveis', emoji: '📊' },
            { label: 'Recompensas de Nível', value: 'rewards', description: 'Cargos por nível', emoji: '🎁' }
        ]);

        const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createBackButton('config_back_to_main')
        );

        await safeRespond(interaction, { embeds: [embed], components: [menu, backRow] });
    } catch (error) {
        logger.error('[ConfigLeveling] Erro em showLevelingMenu:', error);
    }
}

/**
 * Handler Central para Interações de Leveling
 */
export async function handleLevelingInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const customId = interaction.customId;

    try {
        // Submenu navigation
        if (customId === 'config_leveling_submenu' && interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            switch (choice) {
                case 'xp': await showXpConfig(interaction); break;
                case 'levelup': await showLevelUpConfig(interaction); break;
                case 'formula': await showFormulaConfig(interaction); break;
                case 'rewards': await showRewardsConfig(interaction); break;
            }
            return;
        }

        // XP Config
        if (customId === 'config_leveling_xp_back') return await showLevelingMenu(interaction);
        if (customId === 'config_leveling_xp_edit') {
            await showXpEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_leveling_xp_modal') {
            await handleXpEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Level Up Config
        if (customId === 'config_leveling_levelup_back') return await showLevelingMenu(interaction);
        if (customId === 'config_leveling_levelup_toggle') {
            await toggleLevelUp(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_leveling_levelup_embed') {
            await toggleLevelUpEmbed(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_leveling_levelup_edit') {
            await showLevelUpEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_leveling_levelup_modal') {
            await handleLevelUpEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Formula Config
        if (customId === 'config_leveling_formula_back') return await showLevelingMenu(interaction);
        if (customId === 'config_leveling_formula_edit') {
            await showFormulaEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_leveling_formula_modal') {
            await handleFormulaEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Rewards Config
        if (customId === 'config_leveling_rewards_back') return await showLevelingMenu(interaction);

    } catch (error) {
        logger.error(`[ConfigLeveling] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}

// =========================================
// XP Settings Implementation
// =========================================

async function showXpConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const xp = config.xp_settings || { min_xp: 15, max_xp: 25, cooldown: 60, allowed_channels: [], ignored_channels: [] };

    const embed = createConfigEmbed(
        'Configurações de XP',
        '📈',
        'Configure o ganho de experiência por mensagem.'
    );

    embed.addFields(
        { name: '📈 XP Mínimo', value: `${xp.min_xp}`, inline: true },
        { name: '📈 XP Máximo', value: `${xp.max_xp}`, inline: true },
        { name: '⏰ Cooldown', value: `${xp.cooldown} segundos`, inline: true },
        { name: '✅ Canais Permitidos', value: xp.allowed_channels?.length ? `${xp.allowed_channels.length} canais` : 'Todos', inline: true },
        { name: '❌ Canais Ignorados', value: xp.ignored_channels?.length ? `${xp.ignored_channels.length} canais` : 'Nenhum', inline: true }
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('config_leveling_xp_edit')
            .setLabel('Editar Valores')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_leveling_xp_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function showXpEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const xp = config.xp_settings || { min_xp: 15, max_xp: 25, cooldown: 60 };

    const modal = createMultiFieldModal('config_leveling_xp_modal', 'Editar XP', [
        { id: 'min_xp', label: 'XP Mínimo por mensagem', value: String(xp.min_xp), placeholder: 'Ex: 15' },
        { id: 'max_xp', label: 'XP Máximo por mensagem', value: String(xp.max_xp), placeholder: 'Ex: 25' },
        { id: 'cooldown', label: 'Cooldown (segundos)', value: String(xp.cooldown), placeholder: 'Ex: 60' }
    ]);

    await interaction.showModal(modal);
}

async function handleXpEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const minXp = parseInt(interaction.fields.getTextInputValue('min_xp'));
    const maxXp = parseInt(interaction.fields.getTextInputValue('max_xp'));
    const cooldown = parseInt(interaction.fields.getTextInputValue('cooldown'));

    let errors: string[] = [];

    const r1 = await updateConfigField(FILENAME, 'xp_settings.min_xp', minXp, interaction.user.id);
    if (!r1.success) errors.push(`XP Mín: ${r1.error}`);

    const r2 = await updateConfigField(FILENAME, 'xp_settings.max_xp', maxXp, interaction.user.id);
    if (!r2.success) errors.push(`XP Máx: ${r2.error}`);

    const r3 = await updateConfigField(FILENAME, 'xp_settings.cooldown', cooldown, interaction.user.id);
    if (!r3.success) errors.push(`Cooldown: ${r3.error}`);

    if (errors.length > 0) {
        await interaction.editReply({ content: errorMessage(`Erros:\n${errors.join('\n')}`) });
    } else {
        await interaction.editReply({ content: successMessage('Configurações de XP atualizadas!') });
    }
}

// =========================================
// Level Up Implementation
// =========================================

async function showLevelUpConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const levelUp = config.level_up_message || { enabled: true, use_embed: true, content: '{user} subiu de nível!' };

    const embed = createConfigEmbed(
        'Mensagem de Level Up',
        '📢',
        'Configure a mensagem exibida quando um usuário sobe de nível.'
    );

    embed.addFields(
        { name: '📊 Status', value: levelUp.enabled ? '✅ Ativada' : '❌ Desativada', inline: true },
        { name: '🖼️ Usar Embed', value: levelUp.use_embed ? '✅ Sim' : '❌ Não', inline: true },
        { name: '📍 Canal', value: levelUp.channel_id ? `<#${levelUp.channel_id}>` : 'Canal atual', inline: true },
        { name: '💬 Mensagem', value: levelUp.content?.substring(0, 100) || 'Padrão', inline: false }
    );

    if (levelUp.embed) {
        embed.addFields(
            { name: '📝 Título do Embed', value: levelUp.embed.title || 'Padrão', inline: true },
            { name: '🎨 Cor', value: levelUp.embed.color || '#39FF14', inline: true }
        );
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createToggleButton('config_leveling_levelup_toggle', levelUp.enabled),
        createToggleButton('config_leveling_levelup_embed', levelUp.use_embed, 'Desativar Embed', 'Ativar Embed'),
        new ButtonBuilder()
            .setCustomId('config_leveling_levelup_edit')
            .setLabel('Editar Mensagem')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_leveling_levelup_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function toggleLevelUp(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const enabled = config.level_up_message?.enabled ?? true;
    await updateConfigField(FILENAME, 'level_up_message.enabled', !enabled, interaction.user.id);
    await showLevelUpConfig(interaction);
}

async function toggleLevelUpEmbed(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const useEmbed = config.level_up_message?.use_embed ?? true;
    await updateConfigField(FILENAME, 'level_up_message.use_embed', !useEmbed, interaction.user.id);
    await showLevelUpConfig(interaction);
}

async function showLevelUpEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const levelUp = config.level_up_message || {};

    const modal = createMultiFieldModal('config_leveling_levelup_modal', 'Editar Level Up', [
        { id: 'content', label: 'Mensagem ({user}, {level})', value: levelUp.content || '', placeholder: '{user} subiu para o nível {level}!', maxLength: 2000 },
        { id: 'title', label: 'Título do Embed', value: levelUp.embed?.title || '', placeholder: '✨ Novo Nível!' },
        { id: 'color', label: 'Cor do Embed (#HEX)', value: levelUp.embed?.color || '#39FF14', placeholder: '#39FF14' }
    ]);

    await interaction.showModal(modal);
}

async function handleLevelUpEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const content = interaction.fields.getTextInputValue('content');
    const title = interaction.fields.getTextInputValue('title');
    const color = interaction.fields.getTextInputValue('color');

    // Update fields sequentially to avoid race conditions with simple file config
    await updateConfigField(FILENAME, 'level_up_message.content', content, interaction.user.id);
    await updateConfigField(FILENAME, 'level_up_message.embed.title', title, interaction.user.id);

    const colorResult = await updateConfigField(FILENAME, 'level_up_message.embed.color', color, interaction.user.id);

    if (!colorResult.success) {
        await interaction.editReply({ content: errorMessage(`Cor inválida: ${colorResult.error}`) });
    } else {
        await interaction.editReply({ content: successMessage('Mensagem de Level Up atualizada!') });
    }
}

// =========================================
// Formula Implementation
// =========================================

async function showFormulaConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const formula = config.formula || { base_multiplier: 10, level_multiplier: 50, offset: 200 };

    const embed = createConfigEmbed(
        'Fórmula de XP para Próximo Nível',
        '📊',
        'Configure a curva de progressão de níveis.\n\n' +
        '**Fórmula:** `XP = (level × level_multiplier) + (level × base_multiplier) + offset`'
    );

    // Calcular exemplos
    const exampleLevels = [1, 5, 10, 20, 50];
    const examples = exampleLevels.map(level => {
        const xpNeeded = (level * formula.level_multiplier) + (level * formula.base_multiplier) + formula.offset;
        return `Nível ${level}: ${xpNeeded.toLocaleString()} XP`;
    }).join('\n');

    embed.addFields(
        { name: '📈 Base Multiplier', value: `${formula.base_multiplier}`, inline: true },
        { name: '📈 Level Multiplier', value: `${formula.level_multiplier}`, inline: true },
        { name: '📈 Offset', value: `${formula.offset}`, inline: true },
        { name: '📋 Exemplos', value: examples, inline: false }
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('config_leveling_formula_edit')
            .setLabel('Editar Fórmula')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_leveling_formula_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function showFormulaEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const formula = config.formula || { base_multiplier: 10, level_multiplier: 50, offset: 200 };

    const modal = createMultiFieldModal('config_leveling_formula_modal', 'Editar Fórmula', [
        { id: 'base', label: 'Base Multiplier (1-100)', value: String(formula.base_multiplier), placeholder: 'Ex: 10' },
        { id: 'level', label: 'Level Multiplier (1-500)', value: String(formula.level_multiplier), placeholder: 'Ex: 50' },
        { id: 'offset', label: 'Offset (0-10000)', value: String(formula.offset), placeholder: 'Ex: 200' }
    ]);

    await interaction.showModal(modal);
}

async function handleFormulaEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const base = parseInt(interaction.fields.getTextInputValue('base'));
    const level = parseInt(interaction.fields.getTextInputValue('level'));
    const offset = parseInt(interaction.fields.getTextInputValue('offset'));

    let errors: string[] = [];

    const r1 = await updateConfigField(FILENAME, 'formula.base_multiplier', base, interaction.user.id);
    if (!r1.success) errors.push(`Base: ${r1.error}`);

    const r2 = await updateConfigField(FILENAME, 'formula.level_multiplier', level, interaction.user.id);
    if (!r2.success) errors.push(`Level: ${r2.error}`);

    const r3 = await updateConfigField(FILENAME, 'formula.offset', offset, interaction.user.id);
    if (!r3.success) errors.push(`Offset: ${r3.error}`);

    if (errors.length > 0) {
        await interaction.editReply({ content: errorMessage(`Erros:\n${errors.join('\n')}`) });
    } else {
        await interaction.editReply({ content: successMessage('Fórmula atualizada!') });
    }
}

// =========================================
// Rewards Implementation
// =========================================

async function showRewardsConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<LevelingConfig>(FILENAME);
    const rewards = config.level_rewards?.roles || {};

    const embed = createConfigEmbed(
        'Recompensas por Nível',
        '🎁',
        'Configure os cargos concedidos ao atingir determinados níveis.'
    );

    const levels = Object.keys(rewards).sort((a, b) => parseInt(a) - parseInt(b));

    if (levels.length === 0) {
        embed.addFields({ name: '📋 Recompensas', value: 'Nenhuma recompensa configurada', inline: false });
    } else {
        const rewardsText = levels.map(level => {
            const roleId = rewards[parseInt(level)];
            return `**Nível ${level}:** <@&${roleId}>`;
        }).join('\n');
        embed.addFields({ name: '📋 Recompensas Configuradas', value: rewardsText.substring(0, 1024), inline: false });
    }

    embed.setFooter({ text: 'Para editar recompensas, modifique o arquivo leveling.yml diretamente.' });

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_leveling_rewards_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}
