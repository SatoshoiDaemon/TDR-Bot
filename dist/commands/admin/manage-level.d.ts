import { ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
export declare const manageLevelCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
    handleLogic(ctx: ChatInputCommandInteraction | Message, sub: string, target: GuildMember, value: number): Promise<void>;
};
