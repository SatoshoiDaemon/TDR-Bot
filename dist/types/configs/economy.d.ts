/**
 * Interface de Configuração de Economia
 * Corresponde a: config/economy.yml
 */
export interface EconomyConfig {
    daily: DailyConfig;
    collect_roles: CollectRole[];
    robbery: RobberyConfig;
    bets: BetsConfig;
}
export interface DailyConfig {
    base_amount: number;
    cooldown: string;
    rewards: {
        money_min: number;
        money_max: number;
        xp_min: number;
        xp_max: number;
    };
}
/** Formato: [quantidade, cargo_id, cooldown] */
export type CollectRole = [number, string, string];
export interface RobberyConfig {
    enabled: boolean;
    min_wallet_to_rob: number;
    min_wallet_to_attempt: number;
    chances: RobberyChance[];
    steal_percentage: {
        min: number;
        max: number;
    };
    fail_penalty: number;
    immunity: {
        roles: string[];
        users: string[];
        inactivity_days: number;
    };
}
export interface RobberyChance {
    threshold: number;
    chance: number;
}
export interface BetsConfig {
    min_bet: number;
    max_bet: number;
    games: {
        mines: MinesConfig;
        roulette: RouletteConfig;
    };
}
export interface MinesConfig {
    max_mines: number;
    multipliers: number[];
}
export interface RouletteConfig {
    multipliers: {
        red: number;
        black: number;
        green: number;
    };
}
