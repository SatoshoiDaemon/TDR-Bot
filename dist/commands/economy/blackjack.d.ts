import { ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando de Blackjack - Jogo de cartas contra o dealer
 *
 * Funcionalidades:
 * - Aposta mínima configurável
 * - Sistema de Hit/Stand
 * - Lógica de Ás (1 ou 11)
 * - Devolução de aposta em caso de timeout
 * - Pagamento 2x em vitória
 */
export declare const blackjackCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
};
