import { Client } from 'discord.js';
export declare class ChatMovementScheduler {
    private client;
    private interval;
    private guildId;
    constructor(client: Client, guildId: string);
    start(): void;
    run(): Promise<void>;
    stop(): void;
}
