import { Client } from 'discord.js';
import { SnapshotData } from '../types/types.js';
import { SnapshotDatabase } from '../database/database.js';
export declare class SnapshotService {
    private client;
    private database;
    constructor(client: Client, database: SnapshotDatabase);
    createGuildSnapshot(guildId: string): Promise<SnapshotData>;
    createCategorySnapshot(guildId: string, categoryId: string): Promise<any>;
    private snapshotChannels;
    private snapshotChannel;
    private snapshotPermissions;
    private snapshotRoles;
    private snapshotRole;
    private snapshotGuildConfig;
}
