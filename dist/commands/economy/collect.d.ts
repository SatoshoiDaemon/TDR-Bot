import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando Collect - Coleta de dracmas por cargos
 *
 * Funcionalidades:
 * - Coleta baseada em cargos do usuário
 * - Cooldown individual por cargo
 * - Múltiplas coletas simultâneas
 * - Sistema de cache (Redis)
 */
export declare const collectCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
};
