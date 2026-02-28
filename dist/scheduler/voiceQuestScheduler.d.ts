import { Client } from 'discord.js';
export declare class VoiceQuestScheduler {
    private client;
    constructor(client: Client);
    start(): void;
    private processVoiceTime;
}
