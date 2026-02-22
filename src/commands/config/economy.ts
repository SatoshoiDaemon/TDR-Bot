/**
 * Config Module: Economia
 * Configurações de economia: daily, robbery, bets, collect_roles
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    type MessageComponentInteraction,
    type ButtonInteraction,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction
    ,
    MessageFlags
} from 'discord.js';
import { ConfigService } from '@services/configService.js';
import { logger } from '@shared/logger.js';
import type { EconomyConfig } from '../../types/configs/economy.js';
import {
    createConfigEmbed,
    createBackButton,
    createToggleButton,
    createSubcategoryMenu,
    createMultiFieldModal,
    formatPercent,
    updateConfigField,
    successMessage,
    errorMessage,
    safeRespond
} from './shared.js';

const FILENAME = 'economy.yml';

/**
 * Menu principal de Economia
 */
export async function showEconomyMenu(
    interaction: any,
    backHandler?: any // Mantido para compatibilidade, mas não usado internamente
) {
    try {
        const config = ConfigService.getConfig<EconomyConfig>(FILENAME);

        const embed = createConfigEmbed(
            'Configurações de Economia',
            '💰',
            'Configure o sistema econômico do servidor.\n\n' +
            '**📊 Status Atual:**'
        );

        // Adicionar status resumido
        embed.addFields(
            { name: '💵 Daily Base', value: `${config.daily?.base_amount || 0} Dracmas`, inline: true },
            { name: '⏰ Cooldown', value: config.daily?.cooldown || '24h', inline: true },
            { name: '🔪 Roubo', value: config.robbery?.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
            { name: '🎰 Apostas', value: `Min: ${config.bets?.min_bet || 0} Dracmas | Max: ${config.bets?.max_bet || 0} Dracmas`, inline: false }
        );

        const menu = createSubcategoryMenu('config_economy_submenu', 'Selecione uma subcategoria...', [
            { label: 'Daily', value: 'daily', description: 'Recompensas diárias e cooldown', emoji: '💵' },
            { label: 'Roubo', value: 'robbery', description: 'Sistema de roubo entre usuários', emoji: '🔪' },
            { label: 'Apostas', value: 'bets', description: 'Limites de apostas e jogos', emoji: '🎰' },
            { label: 'Coleta por Cargo', value: 'collect', description: 'Recompensas por cargo', emoji: '👑' }
        ]);

        const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createBackButton('config_back_to_main')
        );

        await safeRespond(interaction, { embeds: [embed], components: [menu, backRow] });
    } catch (error) {
        logger.error('[ConfigEconomy] Erro em showEconomyMenu:', error);
    }
}

/**
 * Handler Central para Interações de Economia
 * Chamado pelo ConfigInteractionHandler
 */
export async function handleEconomyInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const customId = interaction.customId;

    try {
        // Submenu navigation
        if (customId === 'config_economy_submenu' && interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            switch (choice) {
                case 'daily': await showDailyConfig(interaction); break;
                case 'robbery': await showRobberyConfig(interaction); break;
                case 'bets': await showBetsConfig(interaction); break;
                case 'collect': await showCollectConfig(interaction); break;
            }
            return;
        }

        // Daily Config
        if (customId === 'config_economy_daily_back') return await showEconomyMenu(interaction);
        if (customId === 'config_economy_daily_edit') {
            await showDailyEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_economy_daily_modal') {
            await handleDailyEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Robbery Config
        if (customId === 'config_economy_robbery_back') return await showEconomyMenu(interaction);
        if (customId === 'config_economy_robbery_toggle') {
            await toggleRobbery(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_economy_robbery_edit') {
            await showRobberyEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_economy_robbery_modal') {
            await handleRobberyEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Bets Config
        if (customId === 'config_economy_bets_back') return await showEconomyMenu(interaction);
        if (customId === 'config_economy_bets_edit') {
            await showBetsEditModal(interaction as ButtonInteraction);
            return;
        }
        if (customId === 'config_economy_bets_modal') {
            await handleBetsEditModal(interaction as ModalSubmitInteraction);
            return;
        }

        // Collect Config
        if (customId === 'config_economy_collect_back') return await showEconomyMenu(interaction);

    } catch (error) {
        logger.error(`[ConfigEconomy] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}

// =========================================
// Daily Implementation
// =========================================

async function showDailyConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const daily = config.daily || { base_amount: 500, cooldown: '24h', rewards: { money_min: 100, money_max: 1000, xp_min: 50, xp_max: 500 } };

    const embed = createConfigEmbed(
        'Configurações de Daily',
        '💵',
        'Configure as recompensas do comando `/daily`.'
    );

    embed.addFields(
        { name: '💰 Valor Base', value: `${daily.base_amount} Dracmas`, inline: true },
        { name: '⏰ Cooldown', value: daily.cooldown, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '💵 Dracmas', value: `Min: ${daily.rewards?.money_min || 0} Dracmas | Max: ${daily.rewards?.money_max || 0} Dracmas`, inline: true },
        { name: '✨ XP', value: `Min: ${daily.rewards?.xp_min || 0} | Max: ${daily.rewards?.xp_max || 0}`, inline: true }
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('config_economy_daily_edit')
            .setLabel('Editar Valores')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_economy_daily_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function showDailyEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const daily = config.daily || { base_amount: 500, cooldown: '24h', rewards: { money_min: 100, money_max: 1000, xp_min: 50, xp_max: 500 } };

    const modal = createMultiFieldModal('config_economy_daily_modal', 'Editar Daily', [
        { id: 'base_amount', label: 'Valor Base (Dracmas)', value: String(daily.base_amount), placeholder: 'Ex: 500' },
        { id: 'money_min', label: 'Dracmas Mínimo', value: String(daily.rewards?.money_min || 100), placeholder: 'Ex: 100' },
        { id: 'money_max', label: 'Dracmas Máximo', value: String(daily.rewards?.money_max || 1000), placeholder: 'Ex: 1000' },
        { id: 'xp_min', label: 'XP Mínimo', value: String(daily.rewards?.xp_min || 50), placeholder: 'Ex: 50' },
        { id: 'xp_max', label: 'XP Máximo', value: String(daily.rewards?.xp_max || 500), placeholder: 'Ex: 500' }
    ]);

    await interaction.showModal(modal);
}

async function handleDailyEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const baseAmount = parseInt(interaction.fields.getTextInputValue('base_amount'));
    const moneyMin = parseInt(interaction.fields.getTextInputValue('money_min'));
    const moneyMax = parseInt(interaction.fields.getTextInputValue('money_max'));
    const xpMin = parseInt(interaction.fields.getTextInputValue('xp_min'));
    const xpMax = parseInt(interaction.fields.getTextInputValue('xp_max'));

    let errors: string[] = [];

    const r1 = await updateConfigField(FILENAME, 'daily.base_amount', baseAmount, interaction.user.id);
    if (!r1.success) errors.push(`Valor Base: ${r1.error}`);

    const r2 = await updateConfigField(FILENAME, 'daily.rewards.money_min', moneyMin, interaction.user.id);
    if (!r2.success) errors.push(`Dracmas Mín: ${r2.error}`);

    const r3 = await updateConfigField(FILENAME, 'daily.rewards.money_max', moneyMax, interaction.user.id);
    if (!r3.success) errors.push(`Dracmas Máx: ${r3.error}`);

    const r4 = await updateConfigField(FILENAME, 'daily.rewards.xp_min', xpMin, interaction.user.id);
    if (!r4.success) errors.push(`XP Mín: ${r4.error}`);

    const r5 = await updateConfigField(FILENAME, 'daily.rewards.xp_max', xpMax, interaction.user.id);
    if (!r5.success) errors.push(`XP Máx: ${r5.error}`);

    if (errors.length > 0) {
        await interaction.editReply({ content: errorMessage(`Erros:\n${errors.join('\n')}`) });
    } else {
        await interaction.editReply({ content: successMessage('Configurações de Daily atualizadas!') });
    }

    // Voltar para o menu daily após delay (opcional, ou deixar usuário clicar em fechar/voltar)
    // Como é ephemeral, não podemos editar a mensagem original facilmente se for reply de modal
    // O ideal seria mandar novo menu, mas isso polui.
    // Vamos deixar o usuário ver a msg de sucesso.
}

// =========================================
// Robbery Implementation
// =========================================

async function showRobberyConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const robbery = config.robbery || { enabled: false, min_wallet_to_rob: 100, fail_penalty: 0.2 };

    const embed = createConfigEmbed(
        'Configurações de Roubo',
        '🔪',
        'Configure o sistema de roubo entre usuários.'
    );

    embed.addFields(
        { name: '📊 Status', value: robbery.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
        { name: '💰 Mínimo para Roubar', value: `${robbery.min_wallet_to_rob || 0} Dracmas`, inline: true },
        { name: '💸 Mínimo para Tentar', value: `${robbery.min_wallet_to_attempt || 0} Dracmas`, inline: true },
        { name: '📉 Penalidade de Falha', value: formatPercent(robbery.fail_penalty || 0), inline: true },
        { name: '🎯 % Roubo Mín', value: formatPercent(robbery.steal_percentage?.min || 0), inline: true },
        { name: '🎯 % Roubo Máx', value: formatPercent(robbery.steal_percentage?.max || 0), inline: true }
    );

    if (robbery.immunity) {
        const immuneRoles = robbery.immunity.roles?.length || 0;
        const immuneUsers = robbery.immunity.users?.length || 0;
        embed.addFields({
            name: '🛡️ Imunidades',
            value: `${immuneRoles} cargos, ${immuneUsers} usuários, ${robbery.immunity.inactivity_days || 0} dias de inatividade`,
            inline: false
        });
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createToggleButton('config_economy_robbery_toggle', robbery.enabled),
        new ButtonBuilder()
            .setCustomId('config_economy_robbery_edit')
            .setLabel('Editar Valores')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_economy_robbery_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function toggleRobbery(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const robbery = config.robbery || { enabled: false };

    await updateConfigField(FILENAME, 'robbery.enabled', !robbery.enabled, interaction.user.id);
    await showRobberyConfig(interaction);
}

async function showRobberyEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const robbery = config.robbery || { enabled: false };

    const modal = createMultiFieldModal('config_economy_robbery_modal', 'Editar Roubo', [
        { id: 'min_to_rob', label: 'Mínimo para ser roubado (Dracmas)', value: String(robbery.min_wallet_to_rob || 100), placeholder: 'Ex: 100' },
        { id: 'min_to_attempt', label: 'Mínimo para tentar (Dracmas)', value: String(robbery.min_wallet_to_attempt || 50), placeholder: 'Ex: 50' },
        { id: 'fail_penalty', label: 'Penalidade de falha (0-1)', value: String(robbery.fail_penalty || 0.2), placeholder: 'Ex: 0.2 = 20%' },
        { id: 'steal_min', label: '% Mín para roubar (0-1)', value: String(robbery.steal_percentage?.min || 0.1), placeholder: 'Ex: 0.1 = 10%' },
        { id: 'steal_max', label: '% Máx para roubar (0-1)', value: String(robbery.steal_percentage?.max || 0.5), placeholder: 'Ex: 0.5 = 50%' }
    ]);

    await interaction.showModal(modal);
}

async function handleRobberyEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const minToRob = parseInt(interaction.fields.getTextInputValue('min_to_rob'));
    const minToAttempt = parseInt(interaction.fields.getTextInputValue('min_to_attempt'));
    const failPenalty = parseFloat(interaction.fields.getTextInputValue('fail_penalty'));
    const stealMin = parseFloat(interaction.fields.getTextInputValue('steal_min'));
    const stealMax = parseFloat(interaction.fields.getTextInputValue('steal_max'));

    let errors: string[] = [];

    const r1 = await updateConfigField(FILENAME, 'robbery.min_wallet_to_rob', minToRob, interaction.user.id);
    if (!r1.success) errors.push(`Mín para roubar: ${r1.error}`);

    const r2 = await updateConfigField(FILENAME, 'robbery.min_wallet_to_attempt', minToAttempt, interaction.user.id);
    if (!r2.success) errors.push(`Mín para tentar: ${r2.error}`);

    const r3 = await updateConfigField(FILENAME, 'robbery.fail_penalty', failPenalty, interaction.user.id);
    if (!r3.success) errors.push(`Penalidade: ${r3.error}`);

    const r4 = await updateConfigField(FILENAME, 'robbery.steal_percentage.min', stealMin, interaction.user.id);
    if (!r4.success) errors.push(`% Mín: ${r4.error}`);

    const r5 = await updateConfigField(FILENAME, 'robbery.steal_percentage.max', stealMax, interaction.user.id);
    if (!r5.success) errors.push(`% Máx: ${r5.error}`);

    if (errors.length > 0) {
        await interaction.editReply({ content: errorMessage(`Erros:\n${errors.join('\n')}`) });
    } else {
        await interaction.editReply({ content: successMessage('Configurações de Roubo atualizadas!') });
    }
}

// =========================================
// Bets Implementation
// =========================================

async function showBetsConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const bets = config.bets || { min_bet: 10, max_bet: 50000 };

    const embed = createConfigEmbed(
        'Configurações de Apostas',
        '🎰',
        'Configure os limites de apostas nos jogos.'
    );

    embed.addFields(
        { name: '💵 Aposta Mínima', value: `${bets.min_bet} Dracmas`, inline: true },
        { name: '💰 Aposta Máxima', value: `${bets.max_bet} Dracmas`, inline: true }
    );

    if (bets.games) {
        const minesMax = bets.games.mines?.max_mines || 20;
        const rouletteMultipliers = bets.games.roulette?.multipliers;
        embed.addFields(
            { name: '💣 Mines', value: `Máx ${minesMax} minas`, inline: true },
            { name: '🎡 Roleta', value: rouletteMultipliers ? `Red/Black: ${rouletteMultipliers.red}x | Green: ${rouletteMultipliers.green}x` : 'Padrão', inline: false }
        );
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('config_economy_bets_edit')
            .setLabel('Editar Limites')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✏️'),
        createBackButton('config_economy_bets_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}

async function showBetsEditModal(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const bets = config.bets || { min_bet: 10, max_bet: 50000 };

    const modal = createMultiFieldModal('config_economy_bets_modal', 'Editar Apostas', [
        { id: 'min_bet', label: 'Aposta Mínima (Dracmas)', value: String(bets.min_bet), placeholder: 'Ex: 10' },
        { id: 'max_bet', label: 'Aposta Máxima (Dracmas)', value: String(bets.max_bet), placeholder: 'Ex: 50000' }
    ]);

    await interaction.showModal(modal);
}

async function handleBetsEditModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const minBet = parseInt(interaction.fields.getTextInputValue('min_bet'));
    const maxBet = parseInt(interaction.fields.getTextInputValue('max_bet'));

    let errors: string[] = [];

    const r1 = await updateConfigField(FILENAME, 'bets.min_bet', minBet, interaction.user.id);
    if (!r1.success) errors.push(`Mín: ${r1.error}`);

    const r2 = await updateConfigField(FILENAME, 'bets.max_bet', maxBet, interaction.user.id);
    if (!r2.success) errors.push(`Máx: ${r2.error}`);

    if (errors.length > 0) {
        await interaction.editReply({ content: errorMessage(`Erros:\n${errors.join('\n')}`) });
    } else {
        await interaction.editReply({ content: successMessage('Limites de apostas atualizados!') });
    }
}

// =========================================
// Collect Implementation
// =========================================

async function showCollectConfig(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const config = ConfigService.getConfig<EconomyConfig>(FILENAME);
    const collectRoles = config.collect_roles || [];

    const embed = createConfigEmbed(
        'Configurações de Coleta por Cargo',
        '👑',
        'Configure os cargos que podem coletar recompensas especiais.\n\n' +
        '**Formato:** `[valor, cargo_id, cooldown]`'
    );

    if (collectRoles.length === 0) {
        embed.addFields({ name: '📋 Cargos', value: 'Nenhum cargo configurado', inline: false });
    } else {
        const rolesText = collectRoles.map((role, index) => {
            const [amount, roleId, cooldown] = role;
            return `**${index + 1}.** ${amount} Dracmas | <@&${roleId}> | ${cooldown}`;
        }).join('\n');
        embed.addFields({ name: '📋 Cargos Configurados', value: rolesText.substring(0, 1024), inline: false });
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_economy_collect_back')
    );

    embed.setFooter({ text: 'Para editar cargos, modifique o arquivo economy.yml diretamente.' });

    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}
