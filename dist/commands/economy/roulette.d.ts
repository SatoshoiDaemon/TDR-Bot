import { ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando Roulette - Roleta com cores (Vermelho, Preto, Verde)
 *
 * Funcionalidades:
 * - Vermelho e Preto: multiplicador 2x
 * - Verde (0): multiplicador 14x
 * - Distribuição realista de números
 * - Validação completa de entradas
 */
export declare const rouletteCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
};
