import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const leaderboardCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<void>;
    handleLogic(ctx: ChatInputCommandInteraction | Message, type: string, page: number): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
    getUserPosition(userId: string, type: string): Promise<number | null>;
};
