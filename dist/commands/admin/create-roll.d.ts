import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionResponse } from 'discord.js';
/**
 * Comando Create-Roll - Sistema de gerenciamento de rolls dinâmicos
 *
 * Funcionalidades:
 * - Dashboard interativa com navegação
 * - Criação de novos rolls com gatilhos personalizados
 * - Edição e exclusão de rolls existentes
 * - Gerenciamento de opções com pesos
 * - Sistema de collectors otimizado sem memory leaks
 */
export declare const createRollCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean> | undefined>;
    /**
     * Exibe a dashboard principal de gerenciamento de rolls
     * @param interaction - Interação atual
     * @param page - Página atual (índice do roll)
     */
    showDashboard(interaction: any, page?: number): Promise<void>;
    /**
     * Abre modal para criar novo roll
     */
    handleCreateModal(interaction: any): Promise<void>;
    /**
     * Menu de edição de roll
     */
    handleEditMenu(interaction: any, roll: any): Promise<void>;
    /**
     * Gerenciador de adição de opções
     */
    handleOptionsManager(interaction: any, roll: any): Promise<any>;
};
