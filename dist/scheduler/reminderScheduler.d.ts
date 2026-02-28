import { Client } from 'discord.js';
export declare class ReminderScheduler {
    private client;
    private interval;
    constructor(client: Client);
    start(): void;
    checkReminders(): Promise<void>;
    sendReminder(reminder: any): Promise<void>;
}
