/**
 * Config Command - Componentes Compartilhados
 * Utilitários, helpers e builders reutilizáveis
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputStyle, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, type MessageComponentInteraction, ChannelType } from 'discord.js';
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
    options?: {
        label: string;
        value: string;
    }[];
    channelType?: ChannelType;
    placeholder?: string;
}
/**
 * Cria um embed padrão de categoria de configuração
 */
export declare function createConfigEmbed(title: string, emoji: string, description: string): EmbedBuilder;
/**
 * Adiciona campos de status ao embed
 */
export declare function addStatusFields(embed: EmbedBuilder, fields: {
    name: string;
    value: string;
    inline?: boolean;
}[]): EmbedBuilder;
/**
 * Cria um botão de toggle (ativar/desativar)
 */
export declare function createToggleButton(customId: string, isEnabled: boolean, labelOn?: string, labelOff?: string): ButtonBuilder;
/**
 * Cria um botão de voltar
 */
export declare function createBackButton(customId?: string): ButtonBuilder;
/**
 * Cria um botão de editar (abre modal)
 */
export declare function createEditButton(customId: string, label?: string): ButtonBuilder;
/**
 * Cria uma row com botão de voltar
 */
export declare function createBackRow(customId?: string): ActionRowBuilder<ButtonBuilder>;
/**
 * Cria um select menu de subcategorias
 */
export declare function createSubcategoryMenu(customId: string, placeholder: string, options: ConfigOption[]): ActionRowBuilder<StringSelectMenuBuilder>;
/**
 * Cria um select menu de roles
 */
export declare function createRoleSelect(customId: string, placeholder?: string, multi?: boolean, maxValues?: number): ActionRowBuilder<RoleSelectMenuBuilder>;
/**
 * Cria um select menu de canais
 */
export declare function createChannelSelect(customId: string, channelType?: ChannelType, placeholder?: string, multi?: boolean, maxValues?: number): ActionRowBuilder<ChannelSelectMenuBuilder>;
/**
 * Cria um modal para edição de campo numérico
 */
export declare function createNumberModal(customId: string, title: string, fieldLabel: string, currentValue: number | string, placeholder?: string): ModalBuilder;
/**
 * Cria um modal para edição de texto longo
 */
export declare function createTextModal(customId: string, title: string, fieldLabel: string, currentValue: string, maxLength?: number): ModalBuilder;
/**
 * Cria um modal com múltiplos campos
 */
export declare function createMultiFieldModal(customId: string, title: string, fields: {
    id: string;
    label: string;
    value: string;
    style?: TextInputStyle;
    required?: boolean;
    maxLength?: number;
    placeholder?: string;
}[]): ModalBuilder;
/**
 * Aguarda resposta de um collector de componentes
 */
export declare function awaitComponent<T extends MessageComponentInteraction>(response: any, time?: number): Promise<T | null>;
/**
 * Atualiza um campo de config e retorna sucesso/erro
 */
export declare function updateConfigField(filename: string, path: string, value: any, userId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Formata valor para exibição
 */
export declare function formatValue(value: any): string;
/**
 * Formata porcentagem (0-1) para exibição
 */
export declare function formatPercent(value: number): string;
/**
 * Cria uma mensagem de sucesso
 */
export declare function successMessage(message: string): string;
/**
 * Cria uma mensagem de erro
 */
export declare function errorMessage(message: string): string;
/**
 * Responde a uma interação de forma segura, verificando o estado atual.
 * Previne InteractionAlreadyReplied em todos os cenários.
 */
export declare function safeRespond(interaction: any, data: {
    embeds?: EmbedBuilder[];
    components?: any[];
    content?: string;
}): Promise<void>;
