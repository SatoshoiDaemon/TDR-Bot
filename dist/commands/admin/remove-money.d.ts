import { ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
export declare const removeMoneyCommand: {
    name: string;
    description: string;
    aliases: string[];
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
    handleLogic(ctx: ChatInputCommandInteraction | Message, target: GuildMember, amount: number, location: "wallet" | "bank"): Promise<void>;
};
