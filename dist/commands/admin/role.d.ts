import { ChatInputCommandInteraction } from 'discord.js';
export declare const roleCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<any>;
};
