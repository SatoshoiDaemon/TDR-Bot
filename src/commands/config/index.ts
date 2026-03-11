/**
 * Comando /config - Central de Configurações Modular
 * Autores: K.
 */

import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
    EmbedBuilder
,
    MessageFlags
} from 'discord.js';
import { logger } from '@shared/logger.js';
import { ConfigInteractionHandler } from '../../handlers/configHandler.js';
import { ConfigService } from '@services/configService.js';
import { EMBED_COLORS } from '@shared/embedTheme.js';
import { updateConfigField } from './shared.js';

export const configCommand = {
    name: 'config',
    description: 'Central de configurações do bot',
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Central de configurações do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('menu')
                .setDescription('Abre o menu interativo de configurações')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('get')
                .setDescription('Visualiza o valor de uma configuração')
                .addStringOption(option =>
                    option.setName('file')
                        .setDescription('Arquivo de configuração (ex: economy.yml)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Economy', value: 'economy.yml' },
                            { name: 'Leveling', value: 'leveling.yml' },
                            { name: 'AI', value: 'ai.yml' },
                            { name: 'Welcome', value: 'welcome.yml' },
                            { name: 'Events', value: 'events.yml' },
                            { name: 'Inactivity', value: 'inactivity.yml' },
                            { name: 'Profile', value: 'profile.yml' },
                            { name: 'Quests', value: 'quests.yml' }
                        )
                )
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Chave da configuração (ex: xp_settings.min_xp)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Define o valor de uma configuração')
                .addStringOption(option =>
                    option.setName('file')
                        .setDescription('Arquivo de configuração')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Economy', value: 'economy.yml' },
                            { name: 'Leveling', value: 'leveling.yml' },
                            { name: 'AI', value: 'ai.yml' },
                            { name: 'Welcome', value: 'welcome.yml' },
                            { name: 'Events', value: 'events.yml' },
                            { name: 'Inactivity', value: 'inactivity.yml' },
                            { name: 'Profile', value: 'profile.yml' },
                            { name: 'Quests', value: 'quests.yml' }
                        )
                )
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Chave da configuração (ex: xp_settings.min_xp)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('Novo valor (JSON ou string)')
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(false) || 'menu';

        if (subcommand === 'menu') {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            try {
                await ConfigInteractionHandler.showMainMenu(interaction);
            } catch (error) {
                logger.error('[ConfigCommand] Erro ao abrir menu principal:', error);
                await interaction.editReply({ content: '❌ Ocorreu um erro ao abrir o painel de configurações.' });
            }
            return;
        }

        if (subcommand === 'get') {
            await handleGetConfig(interaction);
            return;
        }

        if (subcommand === 'set') {
            await handleSetConfig(interaction);
            return;
        }
    }
};

export default configCommand;

/**
 * Handle /config get
 */
async function handleGetConfig(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const file = interaction.options.getString('file', true);
    const key = interaction.options.getString('key', true);

    try {
        const value = ConfigService.getField(file, key);

        if (value === undefined) {
            await interaction.editReply({ content: `❌ Chave \`${key}\` não encontrada em \`${file}\`.` });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.INFO)
            .setTitle(`Config: ${key}`)
            .setDescription(`Arquivo: \`${file}\``)
            .addFields({
                name: 'Valor Atual',
                value: `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
            });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        logger.error(`[ConfigCommand] Erro no get command (${file}, ${key}):`, error);
        await interaction.editReply({ content: '❌ Erro ao ler configuração.' });
    }
}

/**
 * Handle /config set
 */
async function handleSetConfig(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const file = interaction.options.getString('file', true);
    const key = interaction.options.getString('key', true);
    const rawValue = interaction.options.getString('value', true);

    try {
        // Tentar parsear como JSON para suportar boolean, number, object
        let value: any;
        try {
            value = JSON.parse(rawValue);
        } catch {
            // Se falhar, assume que é string
            value = rawValue;
            // Tenta converter boolean e number simples se parecer com um
            if (rawValue.toLowerCase() === 'true') value = true;
            else if (rawValue.toLowerCase() === 'false') value = false;
            else if (!isNaN(Number(rawValue)) && rawValue.trim() !== '') value = Number(rawValue);
        }

        const result = await updateConfigField(file, key, value, interaction.user.id);

        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('✅ Configuração Atualizada')
                .setDescription(`A chave \`${key}\` em \`${file}\` foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Novo Valor', value: `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`` }
                );

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: `❌ Erro ao atualizar: ${result.error}` });
        }

    } catch (error) {
        logger.error(`[ConfigCommand] Erro no set command (${file}, ${key}, ${rawValue}):`, error);
        await interaction.editReply({ content: '❌ Erro desconhecido ao atualizar configuração.' });
    }
}
