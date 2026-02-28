import { Client } from 'discord.js';
export declare class SnapshotScheduler {
    private client;
    private database;
    private config;
    private snapshotService;
    private mirrorService;
    private backupLogger;
    constructor(client: Client, database: any, config: {
        guildId: string;
        backupGuildIds: string[];
        systemCategory: string;
        snapshotHour: number;
        webhookUrl?: string;
    });
    start(): void;
    runDailySnapshot(): Promise<void>;
    runManualSnapshot(): Promise<void>;
}
