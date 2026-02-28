import { Client } from 'discord.js';
export declare class FeedService {
    static createPost(client: Client, userId: string, imageUrl: string, caption: string, guildId: string, channelId: string): Promise<import("discord.js").Message<true>>;
    static handleInteraction(interaction: any): Promise<void>;
    static handleModal(interaction: any): Promise<any>;
    private static updateMessage;
}
