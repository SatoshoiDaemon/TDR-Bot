/**
 * Interface de Configuração de Eventos
 * Corresponde a: config/events.yml
 */

export interface EventsConfig {
    enabled: boolean;
    check_interval_minutes: number;
    whitelist_channels: string[];
    blacklist_channels: string[];
    whitelist_categories: string[];
    blacklist_categories: string[];
    fixed_events: FixedEvents;
    random_events: RandomEvents;
}

export interface FixedEvents {
    double_xp_weekend: {
        enabled: boolean;
        multiplier: number;
    };
    daily_shop_deals: {
        enabled: boolean;
        max_items: number;
        discount_percentage: number;
        notification_channel_id: string;
    };
}

export interface RandomEvents {
    money_rain: MoneyRainEvent;
    hot_zone: HotZoneEvent;
    enigma_challenge: EnigmaChallengeEvent;
    diamond_reaction: DiamondReactionEvent;
}

export interface MoneyRainEvent {
    enabled: boolean;
    chance: number;
    duration_minutes: number;
    min_amount: number;
    max_amount: number;
    message: string;
}

export interface HotZoneEvent {
    enabled: boolean;
    chance: number;
    duration_minutes: number;
    xp_multiplier: number;
    message: string;
}

export interface EnigmaChallengeEvent {
    enabled: boolean;
    chance: number;
    reward_min: number;
    reward_max: number;
    types: string[];
}

export interface DiamondReactionEvent {
    enabled: boolean;
    chance: number;
    reward: number;
    message: string;
}
