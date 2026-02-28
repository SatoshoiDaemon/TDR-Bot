export interface APIKeyData {
    id: string;
    key: string;
    status: string;
    usedTokensToday: number;
    dailyTokenLimit: number;
}
export declare class KeyManagerService {
    private static lastKeyIndex;
    /**
     * Obtém a melhor chave disponível com base na estratégia configurada
     */
    static getBestKey(): Promise<APIKeyData | null>;
    /**
     * Registra o uso de tokens por uma chave
     */
    static recordUsage(keyId: string, tokens: number, status?: number): Promise<void>;
    /**
     * Marca uma chave como Rate Limited
     */
    static handleRateLimit(keyId: string): Promise<void>;
    /**
     * Desativa uma chave permanentemente (ex: erro de autenticação)
     */
    static disableKey(keyId: string, reason: string): Promise<void>;
    /**
     * Limpa cooldowns expirados
     */
    static clearExpiredCooldowns(): Promise<void>;
    /**
     * Reseta o contador diário de tokens de todas as chaves
     */
    static resetDailyUsage(): Promise<void>;
}
