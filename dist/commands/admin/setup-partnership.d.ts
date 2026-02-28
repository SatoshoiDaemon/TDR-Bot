import { ChatInputCommandInteraction } from 'discord.js';
export declare const setupPartnershipCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<import("discord.js").InteractionResponse<boolean>>;
};
