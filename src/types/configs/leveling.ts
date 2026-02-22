/**
 * Interface de Configuração de Leveling
 * Corresponde a: config/leveling.yml
 */

export interface LevelingConfig {
    xp_settings: XpSettings;
    level_rewards: LevelRewards;
    level_up_message: LevelUpMessage;
    formula: LevelFormula;
}

export interface XpSettings {
    min_xp: number;
    max_xp: number;
    cooldown: number;
    allowed_channels: string[];
    ignored_channels: string[];
    multipliers: {
        channels: Record<string, number>;
        roles: Record<string, number>;
    };
}

export interface LevelRewards {
    roles: Record<number, string>; // nível -> cargo_id
}

export interface LevelUpMessage {
    enabled: boolean;
    channel_id: string;
    content: string;
    use_embed: boolean;
    embed: LevelUpEmbed;
}

export interface LevelUpEmbed {
    title: string;
    description: string;
    color: string;
    thumbnail: boolean;
    footer: string;
}

export interface LevelFormula {
    base_multiplier: number;
    level_multiplier: number;
    offset: number;
}
