export declare function loadYamlConfig<T>(filename: string): T;
export interface PermissionsConfig {
    staff_level_permission: string;
    staff_members: string[];
    staff_level_roles: string[];
}
export interface LevelingConfig {
    xp_settings: {
        min_xp: number;
        max_xp: number;
        cooldown: number;
        allowed_channels: string[];
        ignored_channels: string[];
        multipliers: {
            channels: Record<string, number>;
            roles: Record<string, number>;
        };
    };
    level_rewards: {
        roles: Record<number, string>;
    };
    level_up_message: {
        enabled: boolean;
        channel_id: string;
        content: string;
        use_embed: boolean;
        embed: {
            title: string;
            description: string;
            color: string;
            thumbnail: boolean;
            footer: string;
        };
    };
    formula: {
        base_multiplier: number;
        level_multiplier: number;
        offset: number;
    };
}
export interface WelcomeConfig {
    enabled: boolean;
    initial_roles: string[];
    dm_message: {
        enabled: boolean;
        content: string;
        use_embed: boolean;
        embed: {
            title: string;
            description: string;
            color: string;
            thumbnail: boolean;
        };
    };
}
export interface EconomyConfig {
    daily: {
        base_amount: number;
        cooldown: string;
        rewards: {
            money_min: number;
            money_max: number;
            xp_min: number;
            xp_max: number;
        };
    };
    collect_roles: [number, string, string][];
    robbery: {
        enabled: boolean;
        min_wallet_to_rob: number;
        min_wallet_to_attempt: number;
        chances: {
            threshold: number;
            chance: number;
        }[];
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
    };
    bets: {
        min_bet: number;
        max_bet: number;
        games: any;
    };
}
export interface ProfileConfig {
    ignored_roles: string[];
    defaults: {
        about_me: string;
        color: string;
        thumbnail: string;
        image: string;
    };
}
export interface QuestConfig {
    player_roles: string[];
    quests_per_day: number;
    rewards: {
        money_multiplier: number;
        xp_multiplier: number;
    };
    quest_types: Record<string, {
        name: string;
        description: string;
        min?: number;
        max?: number;
        target?: number;
        reward_base_money: number;
        reward_base_xp: number;
    }>;
}
export interface AIConfig {
    ai: {
        enabled: boolean;
        model: string;
        temperature: number;
        max_tokens: number;
    };
    prompt: {
        system: string;
        server_context: string;
    };
    security: {
        max_input_length: number;
        sanitize_input: boolean;
        strip_mentions: boolean;
        blocked_patterns: string[];
        suspicious_keywords: string[];
        block_prompt_extraction: boolean;
    };
    memory: {
        short_term: {
            enabled: boolean;
            max_messages: number;
            ttl_minutes: number;
            storage: string;
        };
        medium_term: {
            enabled: boolean;
            max_messages: number;
            ttl_hours: number;
            storage: string;
            summarize: boolean;
        };
        long_term: {
            enabled: boolean;
            storage: string;
            summary_threshold: number;
            track_topics: boolean;
            track_patterns: boolean;
        };
    };
    user_profiling: {
        enabled: boolean;
        track_interests: boolean;
        interests_categories: string[];
        track_behavior: boolean;
        behavior_metrics: string[];
        adaptive_responses: boolean;
        auto_update: boolean;
    };
    functions: {
        enabled: boolean;
        available_functions: Array<{
            name: string;
            description: string;
            enabled: boolean;
            require_permission?: boolean;
            parameters?: string[];
        }>;
    };
    rate_limit: {
        enabled: boolean;
        max_requests_per_user: number;
        window_minutes: number;
        cooldown_seconds: number;
        limit_message: string;
    };
    responses: {
        max_length: number;
        typing_indicator: boolean;
        embed_responses: boolean;
        embed_color: string;
        include_footer: boolean;
        footer_text: string;
        mention_user: boolean;
        add_reactions: boolean;
        reactions: string[];
    };
    mentions: {
        respond_to_mentions: boolean;
        empty_mention_response: string;
        respond_to_replies: boolean;
        allowed_channels: string[];
        ignored_channels: string[];
    };
    knowledge_seed: {
        auto_seed: boolean;
        systems_category_id: string;
        auto_update: boolean;
        update_interval_hours: number;
        source_channels: string[];
    };
    logging: {
        log_interactions: boolean;
        log_function_calls: boolean;
        log_injection_attempts: boolean;
        level: string;
    };
    metrics: {
        enabled: boolean;
        track: string[];
    };
    key_management: {
        enabled: boolean;
        strategy: "round-robin" | "least-used" | "priority";
        auto_disable_on_auth_error: boolean;
        default_cooldown_minutes: number;
        token_limit_buffer: number;
        auto_reset_daily: boolean;
    };
}
export interface TicketYamlConfig {
    enabled: boolean;
    staff_role_ids: string[];
    transcript_channel_id: string;
    category_id: string;
    panel_channel_id: string;
}
export declare const permissionsConfig: PermissionsConfig;
export declare const levelingConfig: LevelingConfig;
export declare const economyConfig: EconomyConfig;
export declare const profileConfig: ProfileConfig;
export declare const aiConfig: AIConfig;
export declare const questConfig: QuestConfig;
export declare const welcomeConfig: WelcomeConfig;
export declare const ticketConfig: TicketYamlConfig;
