import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const afkCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<void>;
};
