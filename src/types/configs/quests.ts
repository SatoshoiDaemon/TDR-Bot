/**
 * Interface de Configuração de Quests
 * Corresponde a: config/quests.yml
 */

export interface QuestsConfig {
    player_roles: string[];
    quests_per_day: number;
    rewards: QuestRewards;
    quest_types: Record<string, QuestType>;
}

export interface QuestRewards {
    money_multiplier: number;
    xp_multiplier: number;
}

export interface QuestType {
    name: string;
    description: string;
    min?: number;
    max?: number;
    target?: number;
    reward_base_money: number;
    reward_base_xp: number;
}
