import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando Shop - Loja interativa do servidor
 *
 * Funcionalidades:
 * - Navegação por páginas
 * - Compra de itens com verificação de saldo
 * - Itens usáveis e de ativação imediata
 * - Atualização automática de estoque
 * - Interface responsiva
 */
export declare const shopCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
