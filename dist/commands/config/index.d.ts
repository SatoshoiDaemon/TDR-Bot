/**
 * Comando /config - Central de Configurações Modular
 * Autores: K.
 */
import { type ChatInputCommandInteraction } from 'discord.js';
export declare const configCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
};
export default configCommand;
