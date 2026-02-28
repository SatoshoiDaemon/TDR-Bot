/**
 * Interfaces de Configuração de Banco de Dados
 * Armazenadas via SystemConfig no PostgreSQL
 */
/**
 * Configuração do sistema de sugestões
 * Key: suggestion_config
 */
export interface SuggestionConfig {
    channelId: string;
    webhookUrl?: string;
}
/**
 * Configuração do Feed Imperial
 * Key: feed_config
 */
export interface FeedConfig {
    channelId: string;
    verifiedRoleId: string;
}
/**
 * Configuração de Parcerias
 * Key: partnership_config
 */
export interface PartnershipConfig {
    partnershipChannelId: string;
    analysisChannelId: string;
    partnerRoleId: string;
    pingRoleId?: string;
    minMembers?: number;
    cooldownDays?: number;
    blacklist: string[];
}
/**
 * Base para todas as configs de banco
 * Inclui metadados de auditoria
 */
export interface SystemConfigEntry<T = unknown> {
    key: string;
    value: T;
    updatedAt?: Date;
    updatedBy?: string;
}
/**
 * Mapa de chaves conhecidas do SystemConfig
 */
export type SystemConfigKey = 'suggestion_config' | 'feed_config' | 'partnership_config';
/**
 * Mapa de tipos para cada chave
 */
export interface SystemConfigTypes {
    suggestion_config: SuggestionConfig;
    feed_config: FeedConfig;
    partnership_config: PartnershipConfig;
}
