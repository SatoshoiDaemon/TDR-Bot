import { ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando Mines - Jogo de campo minado com multiplicadores
 *
 * Funcionalidades:
 * - Grade 5x5 com bombas configuráveis
 * - Sistema de multiplicadores progressivos
 * - Cashout a qualquer momento
 * - Proteção contra cliques múltiplos
 * - Taxa da casa de 5%
 */
export declare const minesCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
};
