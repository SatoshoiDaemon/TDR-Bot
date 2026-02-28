import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const walletCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
