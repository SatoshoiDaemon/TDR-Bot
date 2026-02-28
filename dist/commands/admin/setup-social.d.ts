import { ChatInputCommandInteraction } from 'discord.js';
export declare const setupSocialCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<import("discord.js").InteractionResponse<boolean> | undefined>;
};
