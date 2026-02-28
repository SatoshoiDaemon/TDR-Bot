import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
export declare const helpCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
