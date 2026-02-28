import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
export declare const partnerApplyCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<import("discord.js").InteractionResponse<boolean> | undefined>;
};
