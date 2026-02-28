import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const userinfoCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
