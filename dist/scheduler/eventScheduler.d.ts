import { Client } from 'discord.js';
export declare class EventScheduler {
    private client;
    private lastEventType;
    private lastEnigmaIndex;
    private recentEnigmaIndices;
    constructor(client: Client);
    start(): void;
    private tryStartRandomEvent;
    private static readonly ENIGMAS;
    private startEnigma;
    private startDiamond;
    private startMoneyRain;
    private startHotZone;
    private checkDailyDeals;
    /**
     * Gets a random eligible channel respecting whitelist and blacklist.
     * If whitelist_channels has entries, ONLY those channels are used.
     * Otherwise, all text channels are used EXCEPT blacklisted ones and blacklisted categories.
     */
    private getRandomChannel;
}
