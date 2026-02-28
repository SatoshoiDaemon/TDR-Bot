import { ChatInputCommandInteraction, Message } from 'discord.js';
export declare const rankCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<import("discord.js").InteractionResponse<boolean> | import("discord.js").OmitPartialGroupDMChannel<Message<boolean>> | undefined>;
};
