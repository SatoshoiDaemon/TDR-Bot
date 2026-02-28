import { ChatInputCommandInteraction, Message } from 'discord.js';
export interface RoleplayConfig {
    name: string;
    description: string;
    actionText: string;
    soloText?: string;
    apiEndpoint: string;
}
export declare function createRoleplayCommand(config: RoleplayConfig): {
    name: string;
    description: string;
    data: import("discord.js").SlashCommandOptionsOnlyBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]): Promise<void>;
};
