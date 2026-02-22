/**
 * Config Command - Componentes Compartilhados
 * Utilitários, helpers e builders reutilizáveis
 */

import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ComponentType,
    MessageFlags,
    type MessageComponentInteraction,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction,
    type ButtonInteraction,
    ChannelType
} from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { ConfigService } from '@services/configService.js';
import { logger } from '@shared/logger.js';

// =====================
// Types
// =====================

export type ConfigMenuHandler = (interaction: MessageComponentInteraction, isUpdate?: boolean) => Promise<void>;

export interface ConfigOption {
    label: string;
    value: string;
    description: string;
    emoji?: string;
}

export interface FieldConfig {
    label: string;
    path: string;
    type: 'toggle' | 'number' | 'text' | 'color' | 'channel' | 'role' | 'select';
    filename: string;
    options?: { label: string; value: string }[]; // Para type: 'select'
    channelType?: ChannelType; // Para type: 'channel'
    placeholder?: string;
}

// =====================
// Embed Builders
// =====================

/**
 * Cria um embed padrão de categoria de configuração
 */
export function createConfigEmbed(
    title: string,
    emoji: string,
    description: string
): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setTitle(`${emoji} ${title}`)
        .setDescription(description)
        .setFooter({ text: EMBED_CREDIT });
}

/**
 * Adiciona campos de status ao embed
 */
export function addStatusFields(
    embed: EmbedBuilder,
    fields: { name: string; value: string; inline?: boolean }[]
): EmbedBuilder {
    fields.forEach(field => {
        embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline ?? true
        });
    });
    return embed;
}

// =====================
// Button Builders
// =====================

/**
 * Cria um botão de toggle (ativar/desativar)
 */
export function createToggleButton(
    customId: string,
    isEnabled: boolean,
    labelOn = 'Desativar',
    labelOff = 'Ativar'
): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(isEnabled ? labelOn : labelOff)
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success);
}

/**
 * Cria um botão de voltar
 */
export function createBackButton(customId = 'config_back_to_main'): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('Voltar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');
}

/**
 * Cria um botão de editar (abre modal)
 */
export function createEditButton(customId: string, label = 'Editar'): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️');
}

/**
 * Cria uma row com botão de voltar
 */
export function createBackRow(customId = 'config_back_to_main'): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(createBackButton(customId));
}

// =====================
// Select Menu Builders
// =====================

/**
 * Cria um select menu de subcategorias
 */
export function createSubcategoryMenu(
    customId: string,
    placeholder: string,
    options: ConfigOption[]
): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(options.map(opt => ({
                label: opt.label,
                value: opt.value,
                description: opt.description,
                emoji: opt.emoji
            })))
    );
}

/**
 * Cria um select menu de roles
 */
export function createRoleSelect(
    customId: string,
    placeholder = 'Selecione um cargo...',
    multi = false,
    maxValues = 25
): ActionRowBuilder<RoleSelectMenuBuilder> {
    const select = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder);

    if (multi) {
        select.setMinValues(0).setMaxValues(maxValues);
    }

    return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(select);
}

/**
 * Cria um select menu de canais
 */
export function createChannelSelect(
    customId: string,
    channelType: ChannelType = ChannelType.GuildText,
    placeholder = 'Selecione um canal...',
    multi = false,
    maxValues = 25
): ActionRowBuilder<ChannelSelectMenuBuilder> {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addChannelTypes(channelType);

    if (multi) {
        select.setMinValues(0).setMaxValues(maxValues);
    }

    return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select);
}

// =====================
// Modal Builders
// =====================

/**
 * Cria um modal para edição de campo numérico
 */
export function createNumberModal(
    customId: string,
    title: string,
    fieldLabel: string,
    currentValue: number | string,
    placeholder?: string
): ModalBuilder {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('value')
                    .setLabel(fieldLabel)
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(currentValue))
                    .setPlaceholder(placeholder || 'Digite um número')
                    .setRequired(true)
            )
        );
}

/**
 * Cria um modal para edição de texto longo
 */
export function createTextModal(
    customId: string,
    title: string,
    fieldLabel: string,
    currentValue: string,
    maxLength = 2000
): ModalBuilder {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('value')
                    .setLabel(fieldLabel)
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(currentValue || '')
                    .setMaxLength(maxLength)
                    .setRequired(false)
            )
        );
}

/**
 * Cria um modal com múltiplos campos
 */
export function createMultiFieldModal(
    customId: string,
    title: string,
    fields: {
        id: string;
        label: string;
        value: string;
        style?: TextInputStyle;
        required?: boolean;
        maxLength?: number;
        placeholder?: string;
    }[]
): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    fields.forEach(field => {
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(field.id)
                    .setLabel(field.label)
                    .setStyle(field.style || TextInputStyle.Short)
                    .setValue(field.value || '')
                    .setRequired(field.required ?? false)
                    .setMaxLength(field.maxLength || 1000)
                    .setPlaceholder(field.placeholder || '')
            )
        );
    });

    return modal;
}

// =====================
// Interaction Helpers
// =====================

/**
 * Aguarda resposta de um collector de componentes
 */
export async function awaitComponent<T extends MessageComponentInteraction>(
    response: any,
    time = 120000
): Promise<T | null> {
    try {
        return await response.awaitMessageComponent({ time }) as T;
    } catch {
        return null;
    }
}

/**
 * Atualiza um campo de config e retorna sucesso/erro
 */
export async function updateConfigField(
    filename: string,
    path: string,
    value: any,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const validation = ConfigService.validate(`${filename.replace('.yml', '')}.${path}`, value);

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const success = ConfigService.updateField(filename, path, validation.sanitizedValue ?? value, true);

    if (!success) {
        return { success: false, error: 'Erro ao salvar configuração' };
    }

    return { success: true };
}

/**
 * Formata valor para exibição
 */
export function formatValue(value: any): string {
    if (value === undefined || value === null) return '`Não definido`';
    if (typeof value === 'boolean') return value ? '✅ Ativado' : '❌ Desativado';
    if (typeof value === 'number') return `\`${value}\``;
    if (Array.isArray(value)) {
        if (value.length === 0) return '`Nenhum`';
        if (value.length > 5) return `\`${value.length} itens\``;
        return value.map(v => `\`${v}\``).join(', ');
    }
    if (typeof value === 'string') {
        if (value === '') return '`Vazio`';
        if (value.length > 50) return `\`${value.substring(0, 47)}...\``;
        return `\`${value}\``;
    }
    return String(value);
}

/**
 * Formata porcentagem (0-1) para exibição
 */
export function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

/**
 * Cria uma mensagem de sucesso
 */
export function successMessage(message: string): string {
    return `✅ ${message}`;
}

/**
 * Cria uma mensagem de erro
 */
export function errorMessage(message: string): string {
    return `❌ ${message}`;
}

// =====================
// Safe Interaction Response
// =====================

/**
 * Responde a uma interação de forma segura, verificando o estado atual.
 * Previne InteractionAlreadyReplied em todos os cenários.
 */
export async function safeRespond(
    interaction: any,
    data: { embeds?: EmbedBuilder[]; components?: any[]; content?: string }
): Promise<void> {
    try {
        if (interaction.deferred) {
            await interaction.editReply(data);
        } else if (interaction.replied) {
            await interaction.editReply(data);
        } else if (interaction.isMessageComponent?.() || interaction.isModalSubmit?.()) {
            await interaction.update(data);
        } else {
            await interaction.reply({ ...data, flags: MessageFlags.Ephemeral });
        }
    } catch (error: any) {
        logger.error('[safeRespond] Erro na resposta da interação:', error);

        // Fallback: se update falhar (ex: já expirou), tenta editReply
        if (error.code === 'InteractionAlreadyReplied') {
            try {
                await interaction.editReply(data);
            } catch {
                // Ignora — interação expirada
            }
        }
    }
}
