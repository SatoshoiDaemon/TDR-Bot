/**
 * Config Command - Componentes Compartilhados
 * Utilitários, helpers e builders reutilizáveis
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, MessageFlags, ChannelType } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
// =====================
// Embed Builders
// =====================
/**
 * Cria um embed padrão de categoria de configuração
 */
export function createConfigEmbed(title, emoji, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setTitle(`${emoji} ${title}`)
        .setDescription(description)
        .setFooter({ text: EMBED_CREDIT });
}
/**
 * Adiciona campos de status ao embed
 */
export function addStatusFields(embed, fields) {
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
export function createToggleButton(customId, isEnabled, labelOn = 'Desativar', labelOff = 'Ativar') {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(isEnabled ? labelOn : labelOff)
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success);
}
/**
 * Cria um botão de voltar
 */
export function createBackButton(customId = 'config_back_to_main') {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('Voltar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');
}
/**
 * Cria um botão de editar (abre modal)
 */
export function createEditButton(customId, label = 'Editar') {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️');
}
/**
 * Cria uma row com botão de voltar
 */
export function createBackRow(customId = 'config_back_to_main') {
    return new ActionRowBuilder().addComponents(createBackButton(customId));
}
// =====================
// Select Menu Builders
// =====================
/**
 * Cria um select menu de subcategorias
 */
export function createSubcategoryMenu(customId, placeholder, options) {
    return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(options.map(opt => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
        emoji: opt.emoji
    }))));
}
/**
 * Cria um select menu de roles
 */
export function createRoleSelect(customId, placeholder = 'Selecione um cargo...', multi = false, maxValues = 25) {
    const select = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder);
    if (multi) {
        select.setMinValues(0).setMaxValues(maxValues);
    }
    return new ActionRowBuilder().addComponents(select);
}
/**
 * Cria um select menu de canais
 */
export function createChannelSelect(customId, channelType = ChannelType.GuildText, placeholder = 'Selecione um canal...', multi = false, maxValues = 25) {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addChannelTypes(channelType);
    if (multi) {
        select.setMinValues(0).setMaxValues(maxValues);
    }
    return new ActionRowBuilder().addComponents(select);
}
// =====================
// Modal Builders
// =====================
/**
 * Cria um modal para edição de campo numérico
 */
export function createNumberModal(customId, title, fieldLabel, currentValue, placeholder) {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('value')
        .setLabel(fieldLabel)
        .setStyle(TextInputStyle.Short)
        .setValue(String(currentValue))
        .setPlaceholder(placeholder || 'Digite um número')
        .setRequired(true)));
}
/**
 * Cria um modal para edição de texto longo
 */
export function createTextModal(customId, title, fieldLabel, currentValue, maxLength = 2000) {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('value')
        .setLabel(fieldLabel)
        .setStyle(TextInputStyle.Paragraph)
        .setValue(currentValue || '')
        .setMaxLength(maxLength)
        .setRequired(false)));
}
/**
 * Cria um modal com múltiplos campos
 */
export function createMultiFieldModal(customId, title, fields) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);
    fields.forEach(field => {
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setStyle(field.style || TextInputStyle.Short)
            .setValue(field.value || '')
            .setRequired(field.required ?? false)
            .setMaxLength(field.maxLength || 1000)
            .setPlaceholder(field.placeholder || '')));
    });
    return modal;
}
// =====================
// Interaction Helpers
// =====================
/**
 * Aguarda resposta de um collector de componentes
 */
export async function awaitComponent(response, time = 120000) {
    try {
        return await response.awaitMessageComponent({ time });
    }
    catch {
        return null;
    }
}
/**
 * Atualiza um campo de config e retorna sucesso/erro
 */
export async function updateConfigField(filename, path, value, userId) {
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
export function formatValue(value) {
    if (value === undefined || value === null)
        return '`Não definido`';
    if (typeof value === 'boolean')
        return value ? '✅ Ativado' : '❌ Desativado';
    if (typeof value === 'number')
        return `\`${value}\``;
    if (Array.isArray(value)) {
        if (value.length === 0)
            return '`Nenhum`';
        if (value.length > 5)
            return `\`${value.length} itens\``;
        return value.map(v => `\`${v}\``).join(', ');
    }
    if (typeof value === 'string') {
        if (value === '')
            return '`Vazio`';
        if (value.length > 50)
            return `\`${value.substring(0, 47)}...\``;
        return `\`${value}\``;
    }
    return String(value);
}
/**
 * Formata porcentagem (0-1) para exibição
 */
export function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
}
/**
 * Cria uma mensagem de sucesso
 */
export function successMessage(message) {
    return `✅ ${message}`;
}
/**
 * Cria uma mensagem de erro
 */
export function errorMessage(message) {
    return `❌ ${message}`;
}
// =====================
// Safe Interaction Response
// =====================
/**
 * Responde a uma interação de forma segura, verificando o estado atual.
 * Previne InteractionAlreadyReplied em todos os cenários.
 */
export async function safeRespond(interaction, data) {
    try {
        if (interaction.deferred) {
            await interaction.editReply(data);
        }
        else if (interaction.replied) {
            await interaction.editReply(data);
        }
        else if (interaction.isMessageComponent?.() || interaction.isModalSubmit?.()) {
            await interaction.update(data);
        }
        else {
            await interaction.reply({ ...data, flags: MessageFlags.Ephemeral });
        }
    }
    catch (error) {
        logger.error('[safeRespond] Erro na resposta da interação:', error);
        // Fallback: se update falhar (ex: já expirou), tenta editReply
        if (error.code === 'InteractionAlreadyReplied') {
            try {
                await interaction.editReply(data);
            }
            catch {
                // Ignora — interação expirada
            }
        }
    }
}
//# sourceMappingURL=shared.js.map