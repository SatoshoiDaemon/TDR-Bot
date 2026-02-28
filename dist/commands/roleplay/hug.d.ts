export declare const hugCommand: {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: import("discord.js").ChatInputCommandInteraction | import("discord.js").Message, client: any, db: any, args?: string[]): Promise<void>;
};
