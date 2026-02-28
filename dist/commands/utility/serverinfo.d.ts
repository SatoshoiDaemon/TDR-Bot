import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
export declare const serverinfoCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
