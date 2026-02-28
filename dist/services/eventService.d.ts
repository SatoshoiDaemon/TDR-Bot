export declare enum EventType {
    MONEY_RAIN = "money_rain",
    HOT_ZONE = "hot_zone",
    DOUBLE_XP = "double_xp",
    SHOP_DEAL = "shop_deal"
}
export interface ActiveEvent {
    type: EventType;
    endTime: Date;
    data?: any;
}
export declare class EventService {
    private static activeEvents;
    private static messageCount;
    private static config;
    static loadConfig(): void;
    static isEventActive(type: EventType, channelId?: string): boolean;
    static getActiveEvent(type: EventType): ActiveEvent | undefined;
    static startRandomEvent(type: EventType, durationMinutes: number, data?: any): string;
    static getConfig(): any;
    static trackMessage(): void;
    static getAndResetMessageCount(): number;
}
