import { Client } from 'discord.js';
export declare class StarBoardScheduler {
    private client;
    private interval;
    constructor(client: Client);
    start(): void;
    run(): Promise<void>;
    stop(): void;
}
