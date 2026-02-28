import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const remindCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
    parseTime(str: string): number | null;
};
