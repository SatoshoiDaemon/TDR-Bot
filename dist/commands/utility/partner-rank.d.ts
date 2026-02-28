import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
export declare const partnerRankCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>>>;
};
