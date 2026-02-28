import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
export declare const uptimeCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
