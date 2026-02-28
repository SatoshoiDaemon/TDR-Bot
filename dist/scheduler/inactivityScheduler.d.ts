import { Client } from 'discord.js';
export declare class InactivityScheduler {
    private client;
    private config;
    constructor(client: Client);
    private loadConfig;
    start(): void;
    checkInactivity(): Promise<void>;
    private notifyInactiveMember;
}
