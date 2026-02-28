import { ChatInputCommandInteraction } from 'discord.js';
/**
 * Comando /ticket-panel - Gerenciar painéis de ticket
 */
export declare const ticketPanelCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Criar painel via modal
     */
    handleCreate(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Listar painéis
     */
    handleList(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Enviar painel para canal
     */
    handleSend(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Deletar painel
     */
    handleDelete(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Adicionar opção ao painel
     */
    handleAddOption(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Autocomplete para painéis
     */
    autocomplete(interaction: any): Promise<void>;
};
