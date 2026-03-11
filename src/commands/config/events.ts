/**
 * Config Module: Events
 * Configurações de Eventos Fixos e Aleatórios
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    type MessageComponentInteraction,
    type ButtonInteraction,
    type StringSelectMenuInteraction,
    type ModalSubmitInteraction,
    EmbedBuilder
    ,
    MessageFlags
} from 'discord.js';
import { ConfigService } from '@services/configService.js';
import { logger } from '@shared/logger.js';
import type { EventsConfig } from '../../types/configs/events.js';
import {
    createConfigEmbed,
    createBackButton,
    createToggleButton,
    updateConfigField,
    successMessage,
    errorMessage,
    safeRespond
} from './shared.js';

const FILENAME = 'events.yml';

/**
 * Menu Principal de Eventos
 */
export async function showEventsMenu(
    interaction: any,
    backHandler?: any
) {
    try {
        const config = ConfigService.getConfig<EventsConfig>(FILENAME);

        const embed = createConfigEmbed(
            '📅 Configurações de Eventos',
            '🎉',
            'Gerencie os eventos automáticos, fixos e aleatórios do servidor.'
        );

        embed.addFields(
            { name: 'Sistema Geral', value: config.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
            { name: 'Intervalo de Checagem', value: `${config.check_interval_minutes} minutos`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }, // Spacer
            { name: 'Eventos Fixos', value: `${Object.values(config.fixed_events || {}).filter(e => e.enabled).length} ativos`, inline: true },
            { name: 'Eventos Aleatórios', value: `${Object.values(config.random_events || {}).filter(e => e.enabled).length} ativos`, inline: true }
        );

        const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('config_events_menu')
                .setPlaceholder('Selecione uma categoria de eventos...')
                .addOptions([
                    { label: 'Eventos Fixos', value: 'fixed', description: 'Double XP, Daily Shop Deals, etc.', emoji: '🗓️' },
                    { label: 'Eventos Aleatórios', value: 'random', description: 'Money Rain, Hot Zone, Enigma, etc.', emoji: '🎲' }
                ])
        );

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createToggleButton('config_events_toggle', config.enabled, 'Desativar Sistema', 'Ativar Sistema')
        );

        const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createBackButton('config_back_to_main')
        );

        await safeRespond(interaction, { embeds: [embed], components: [menu, buttons, backRow] });
    } catch (error) {
        logger.error('[ConfigEvents] Erro em showEventsMenu:', error);
    }
}

/**
 * Handler Central para Interações de Eventos
 */
export async function handleEventsInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
    const customId = interaction.customId;

    try {
        if (customId === 'config_events_back') return await showEventsMenu(interaction);

        if (customId === 'config_events_toggle') {
            await toggleEventsSystem(interaction as ButtonInteraction);
            return;
        }

        if (customId === 'config_events_menu' && interaction.isStringSelectMenu()) {
            const selected = interaction.values[0];
            if (selected === 'fixed') await showFixedEventsMenu(interaction);
            else if (selected === 'random') await showRandomEventsMenu(interaction);
            return;
        }

        // Fixed Events Toggles
        if (customId.startsWith('config_events_fixed_')) {
            await toggleFixedEvent(interaction as ButtonInteraction, customId);
            return;
        }

        // Random Events Toggles
        if (customId.startsWith('config_events_random_')) {
            await toggleRandomEvent(interaction as ButtonInteraction, customId);
            return;
        }

    } catch (error) {
        logger.error(`[ConfigEvents] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function toggleEventsSystem(interaction: ButtonInteraction) {
    const config = ConfigService.getConfig<EventsConfig>(FILENAME);
    await updateConfigField(FILENAME, 'enabled', !config.enabled, interaction.user.id);
    await showEventsMenu(interaction);
}

async function showFixedEventsMenu(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const config = ConfigService.getConfig<EventsConfig>(FILENAME);
    const fixed = config.fixed_events || {};

    const embed = createConfigEmbed('🗓️ Eventos Fixos', '📌', 'Configure os eventos que ocorrem em horários ou datas específicas.');

    embed.addFields(
        {
            name: 'Double XP Weekend',
            value: `${fixed.double_xp_weekend?.enabled ? '✅ Ativo' : '❌ Inativo'}\nMultiplicador: ${fixed.double_xp_weekend?.multiplier}x`,
            inline: true
        },
        {
            name: 'Daily Shop Deals',
            value: `${fixed.daily_shop_deals?.enabled ? '✅ Ativo' : '❌ Inativo'}\nItens: ${fixed.daily_shop_deals?.max_items}\nDesconto: ${((fixed.daily_shop_deals?.discount_percentage || 0) * 100).toFixed(0)}%`,
            inline: true
        }
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createToggleButton('config_events_fixed_double_xp', fixed.double_xp_weekend?.enabled, 'Desativar Double XP', 'Ativar Double XP'),
        createToggleButton('config_events_fixed_shop', fixed.daily_shop_deals?.enabled, 'Desativar Shop Deals', 'Ativar Shop Deals')
    );

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_events_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [buttons, backRow] });
}

async function showRandomEventsMenu(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const config = ConfigService.getConfig<EventsConfig>(FILENAME);
    const random = config.random_events || {};

    const embed = createConfigEmbed('🎲 Eventos Aleatórios', '🎰', 'Configure eventos que podem ocorrer a qualquer momento.');

    // Helper to format chance
    const fmtChance = (n?: number) => n ? `${(n * 100).toFixed(0)}%` : '0%';

    embed.addFields(
        { name: '💸 Money Rain', value: `${random.money_rain?.enabled ? '✅' : '❌'} (${fmtChance(random.money_rain?.chance)})`, inline: true },
        { name: '🔥 Hot Zone', value: `${random.hot_zone?.enabled ? '✅' : '❌'} (${fmtChance(random.hot_zone?.chance)})`, inline: true },
        { name: '🧩 Enigma', value: `${random.enigma_challenge?.enabled ? '✅' : '❌'} (${fmtChance(random.enigma_challenge?.chance)})`, inline: true },
        { name: '💎 Diamond', value: `${random.diamond_reaction?.enabled ? '✅' : '❌'} (${fmtChance(random.diamond_reaction?.chance)})`, inline: true }
    );

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createToggleButton('config_events_random_money_rain', random.money_rain?.enabled, 'Money Rain', 'Money Rain'),
        createToggleButton('config_events_random_hot_zone', random.hot_zone?.enabled, 'Hot Zone', 'Hot Zone')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createToggleButton('config_events_random_enigma', random.enigma_challenge?.enabled, 'Enigma', 'Enigma'),
        createToggleButton('config_events_random_diamond', random.diamond_reaction?.enabled, 'Diamond', 'Diamond')
    );

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createBackButton('config_events_back')
    );

    await safeRespond(interaction, { embeds: [embed], components: [row1, row2, backRow] });
}

async function toggleFixedEvent(interaction: ButtonInteraction, customId: string) {
    const config = ConfigService.getConfig<EventsConfig>(FILENAME);
    const fixed = config.fixed_events || {};
    let path = '';
    let currentVal = false;

    if (customId === 'config_events_fixed_double_xp') {
        path = 'fixed_events.double_xp_weekend.enabled';
        currentVal = fixed.double_xp_weekend?.enabled || false;
    } else if (customId === 'config_events_fixed_shop') {
        path = 'fixed_events.daily_shop_deals.enabled';
        currentVal = fixed.daily_shop_deals?.enabled || false;
    }

    if (path) {
        await updateConfigField(FILENAME, path, !currentVal, interaction.user.id);
        await showFixedEventsMenu(interaction);
    }
}

async function toggleRandomEvent(interaction: ButtonInteraction, customId: string) {
    const config = ConfigService.getConfig<EventsConfig>(FILENAME);
    const random = config.random_events || {};
    let path = '';
    let currentVal = false;

    if (customId === 'config_events_random_money_rain') {
        path = 'random_events.money_rain.enabled';
        currentVal = random.money_rain?.enabled || false;
    } else if (customId === 'config_events_random_hot_zone') {
        path = 'random_events.hot_zone.enabled';
        currentVal = random.hot_zone?.enabled || false;
    } else if (customId === 'config_events_random_enigma') {
        path = 'random_events.enigma_challenge.enabled';
        currentVal = random.enigma_challenge?.enabled || false;
    } else if (customId === 'config_events_random_diamond') {
        path = 'random_events.diamond_reaction.enabled';
        currentVal = random.diamond_reaction?.enabled || false;
    }

    if (path) {
        await updateConfigField(FILENAME, path, !currentVal, interaction.user.id);
        await showRandomEventsMenu(interaction);
    }
}
