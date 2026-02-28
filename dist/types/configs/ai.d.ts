/**
 * Interface de Configuração da IA
 * Corresponde a: config/ai.yml
 *
 * NOTA: Configurações sensíveis (security, rate_limit, key_management)
 * não são expostas no comando /config
 */
export interface AIConfig {
    ai: AICore;
    prompt: AIPrompt;
    security: AISecurity;
    memory: AIMemory;
    user_profiling: AIUserProfiling;
    functions: AIFunctions;
    rate_limit: AIRateLimit;
    responses: AIResponses;
    mentions: AIMentions;
    knowledge_seed: AIKnowledgeSeed;
    logging: AILogging;
    metrics: AIMetrics;
    key_management: AIKeyManagement;
}
export interface AICore {
    enabled: boolean;
    model: string;
    temperature: number;
    max_tokens: number;
}
export interface AIPrompt {
    system: string;
    server_context: string;
}
/** Configuração sensível - não expor no /config */
export interface AISecurity {
    max_input_length: number;
    sanitize_input: boolean;
    strip_mentions: boolean;
    blocked_patterns: string[];
    suspicious_keywords: string[];
    block_prompt_extraction: boolean;
}
export interface AIMemory {
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
}
export interface AIUserProfiling {
    enabled: boolean;
    track_interests: boolean;
    interests_categories: string[];
    track_behavior: boolean;
    behavior_metrics: string[];
    adaptive_responses: boolean;
    auto_update: boolean;
}
export interface AIFunctions {
    enabled: boolean;
    available_functions: AIFunction[];
}
export interface AIFunction {
    name: string;
    description: string;
    enabled: boolean;
    require_permission?: boolean;
    parameters?: string[];
}
/** Configuração sensível - não expor no /config */
export interface AIRateLimit {
    enabled: boolean;
    max_requests_per_user: number;
    window_minutes: number;
    cooldown_seconds: number;
    limit_message: string;
}
export interface AIResponses {
    max_length: number;
    typing_indicator: boolean;
    embed_responses: boolean;
    embed_color: string;
    include_footer: boolean;
    footer_text: string;
    mention_user: boolean;
    add_reactions: boolean;
    reactions: string[];
}
export interface AIMentions {
    respond_to_mentions: boolean;
    empty_mention_response: string;
    respond_to_replies: boolean;
    allowed_channels: string[];
    ignored_channels: string[];
}
export interface AIKnowledgeSeed {
    auto_seed: boolean;
    systems_category_id: string;
    auto_update: boolean;
    update_interval_hours: number;
    source_channels: string[];
}
export interface AILogging {
    log_interactions: boolean;
    log_function_calls: boolean;
    log_injection_attempts: boolean;
    level: string;
}
export interface AIMetrics {
    enabled: boolean;
    track: string[];
}
/** Configuração sensível - não expor no /config */
export interface AIKeyManagement {
    enabled: boolean;
    strategy: string;
    auto_disable_on_auth_error: boolean;
    default_cooldown_minutes: number;
    token_limit_buffer: number;
    auto_reset_daily: boolean;
}
/**
 * Configurações SEGURAS da IA para expor no /config
 * Exclui security, rate_limit e key_management
 */
export interface AIConfigSafe {
    ai: AICore;
    responses: AIResponses;
    mentions: Pick<AIMentions, 'respond_to_mentions' | 'respond_to_replies' | 'allowed_channels' | 'ignored_channels'>;
    memory: {
        short_term: Pick<AIMemory['short_term'], 'enabled' | 'max_messages'>;
        medium_term: Pick<AIMemory['medium_term'], 'enabled'>;
        long_term: Pick<AIMemory['long_term'], 'enabled'>;
    };
    functions: {
        enabled: boolean;
    };
}
