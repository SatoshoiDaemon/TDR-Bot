import { Client } from 'discord.js';
export declare class InactivityScheduler {
    private client;
    constructor(client: Client);
    private getConfig;
    start(): void;
    checkInactivity(): Promise<void>;
    private notifyInactiveMember;
}
