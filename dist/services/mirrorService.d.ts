import { Client } from 'discord.js';
import { SnapshotDatabase } from '../database/database.js';
export declare class MirrorService {
    private client;
    private database;
    private syncStats;
    constructor(client: Client, database: SnapshotDatabase);
    analyzeCategory(sourceGuildId: string, targetGuildId: string, categoryId: string): Promise<{
        channels: number;
        messages: number;
        threads: number;
    }>;
    mirrorCategory(sourceGuildId: string, targetGuildId: string, categoryId: string): Promise<void>;
    private mirrorChannel;
    private createChannelCopy;
    private syncPermissions;
    private copyMessages;
    private copyMessage;
    private copyForumThreads;
    private copyTextChannelThreads;
}
