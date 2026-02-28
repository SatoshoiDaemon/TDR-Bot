import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionResponse } from 'discord.js';
export declare const manageShopCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean> | undefined>;
    showDashboard(interaction: any, page?: number): Promise<void>;
    handleCreateModal(interaction: any): Promise<void>;
    handleEditActions(interaction: any, item: any): Promise<void>;
};
