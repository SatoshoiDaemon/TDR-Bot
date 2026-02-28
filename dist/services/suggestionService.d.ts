import { Client } from 'discord.js';
export declare class SuggestionService {
    static createSuggestion(client: Client, userId: string, content: string, guildId: string, channelId: string, webhookUrl?: string): Promise<{
        messageId: string;
        threadId: string;
    }>;
    static handleVote(interaction: any): Promise<void>;
}
