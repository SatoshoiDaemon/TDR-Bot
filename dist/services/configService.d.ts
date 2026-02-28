import type { ConfigFileName, ConfigFileTypes, SystemConfigKey, SystemConfigTypes } from '../types/configs/index.js';
/**
 * Resultado de validação
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitizedValue?: any;
}
/**
 * Regra de validação para um campo
 */
interface ValidationRule {
    type: 'number' | 'string' | 'boolean' | 'array';
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: any[];
    required?: boolean;
}
/**
 * ConfigService - Gerenciamento centralizado de configurações
 * Suporta tanto arquivos YAML quanto banco de dados (SystemConfig)
 */
export declare class ConfigService {
    private static cache;
    /**
     * Lê um arquivo de configuração YAML com tipagem forte
     */
    static getConfig<K extends ConfigFileName>(filename: K): ConfigFileTypes[K];
    static getConfig<T>(filename: string): T;
    /**
     * Salva as configurações em um arquivo YAML
     */
    static saveConfig(filename: string, data: any): boolean;
    /**
     * Atualiza um campo específico em um arquivo de configuração
     * @param filename - Nome do arquivo YAML
     * @param path - Caminho do campo (ex: 'robbery.enabled')
     * @param value - Valor a ser definido
     * @param skipValidation - Pular validação (padrão: false)
     */
    static updateField(filename: string, path: string, value: any, skipValidation?: boolean): boolean;
    /**
     * Obtém um valor específico de um arquivo de configuração
     */
    static getField<T = any>(filename: string, path: string): T | undefined;
    /**
     * Obtém uma configuração do banco de dados (SystemConfig)
     */
    static getSystemConfig<K extends SystemConfigKey>(key: K): Promise<SystemConfigTypes[K] | null>;
    static getSystemConfig<T>(key: string): Promise<T | null>;
    /**
     * Salva uma configuração no banco de dados (SystemConfig)
     * Inclui metadados de auditoria (updatedBy)
     */
    static updateSystemConfig<K extends SystemConfigKey>(key: K, value: Partial<SystemConfigTypes[K]>, updatedBy?: string): Promise<boolean>;
    static updateSystemConfig<T extends object>(key: string, value: T, updatedBy?: string): Promise<boolean>;
    /**
     * Deleta uma configuração do banco de dados
     */
    static deleteSystemConfig(key: string): Promise<boolean>;
    /**
     * Valida um valor para um campo específico
     * @param fieldKey - Chave do campo (ex: 'economy.daily.base_amount')
     * @param value - Valor a ser validado
     */
    static validate(fieldKey: string, value: any): ValidationResult;
    /**
     * Verifica se um campo pode ser configurado via /config
     * (tem validação definida)
     */
    static isConfigurable(fieldKey: string): boolean;
    /**
     * Obtém a regra de validação de um campo
     */
    static getValidationRule(fieldKey: string): ValidationRule | undefined;
    /**
     * Limpa o cache (útil para recarregar do disco forçadamente)
     */
    static clearCache(): void;
    /**
     * Recarrega um arquivo específico do disco
     */
    static reloadConfig(filename: string): void;
}
export {};
