import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
export declare const botinfoCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any): Promise<void>;
};
