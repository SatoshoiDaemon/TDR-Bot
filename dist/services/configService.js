import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
const CONFIG_DIR = join(process.cwd(), 'config');
/**
 * Definições de validação para campos configuráveis
 * Apenas campos que serão expostos no /config
 */
const FIELD_VALIDATIONS = {
    // Economy
    'economy.daily.base_amount': { type: 'number', min: 1, max: 1000000 },
    'economy.daily.rewards.money_min': { type: 'number', min: 0, max: 100000 },
    'economy.daily.rewards.money_max': { type: 'number', min: 1, max: 100000 },
    'economy.daily.rewards.xp_min': { type: 'number', min: 0, max: 10000 },
    'economy.daily.rewards.xp_max': { type: 'number', min: 1, max: 10000 },
    'economy.robbery.enabled': { type: 'boolean' },
    'economy.robbery.min_wallet_to_rob': { type: 'number', min: 0, max: 1000000 },
    'economy.robbery.min_wallet_to_attempt': { type: 'number', min: 0, max: 100000 },
    'economy.robbery.fail_penalty': { type: 'number', min: 0, max: 1 },
    'economy.robbery.steal_percentage.min': { type: 'number', min: 0, max: 1 },
    'economy.robbery.steal_percentage.max': { type: 'number', min: 0, max: 1 },
    'economy.robbery.immunity.inactivity_days': { type: 'number', min: 1, max: 365 },
    'economy.bets.min_bet': { type: 'number', min: 1, max: 10000 },
    'economy.bets.max_bet': { type: 'number', min: 100, max: 10000000 },
    // Leveling
    'leveling.xp_settings.min_xp': { type: 'number', min: 1, max: 500 },
    'leveling.xp_settings.max_xp': { type: 'number', min: 1, max: 1000 },
    'leveling.xp_settings.cooldown': { type: 'number', min: 10, max: 600 },
    'leveling.level_up_message.enabled': { type: 'boolean' },
    'leveling.level_up_message.use_embed': { type: 'boolean' },
    'leveling.level_up_message.content': { type: 'string', maxLength: 2000 },
    'leveling.level_up_message.embed.title': { type: 'string', maxLength: 256 },
    'leveling.level_up_message.embed.description': { type: 'string', maxLength: 4096 },
    'leveling.level_up_message.embed.color': { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
    'leveling.formula.base_multiplier': { type: 'number', min: 1, max: 100 },
    'leveling.formula.level_multiplier': { type: 'number', min: 1, max: 500 },
    'leveling.formula.offset': { type: 'number', min: 0, max: 10000 },
    // AI (apenas configs seguras)
    'ai.ai.enabled': { type: 'boolean' },
    'ai.ai.model': { type: 'string', enum: ['gemini-flash-latest', 'gemini-pro', 'gemini-1.5-pro'] },
    'ai.ai.temperature': { type: 'number', min: 0, max: 2 },
    'ai.ai.max_tokens': { type: 'number', min: 100, max: 8192 },
    'ai.responses.max_length': { type: 'number', min: 100, max: 4000 },
    'ai.responses.typing_indicator': { type: 'boolean' },
    'ai.responses.embed_responses': { type: 'boolean' },
    'ai.responses.embed_color': { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
    'ai.responses.mention_user': { type: 'boolean' },
    'ai.mentions.respond_to_mentions': { type: 'boolean' },
    'ai.mentions.respond_to_replies': { type: 'boolean' },
    'ai.memory.short_term.enabled': { type: 'boolean' },
    'ai.memory.short_term.max_messages': { type: 'number', min: 1, max: 50 },
    'ai.memory.medium_term.enabled': { type: 'boolean' },
    'ai.memory.long_term.enabled': { type: 'boolean' },
    'ai.functions.enabled': { type: 'boolean' },
    // Welcome
    'welcome.enabled': { type: 'boolean' },
    'welcome.dm_message.enabled': { type: 'boolean' },
    'welcome.dm_message.content': { type: 'string', maxLength: 2000 },
    'welcome.dm_message.use_embed': { type: 'boolean' },
    'welcome.dm_message.embed.title': { type: 'string', maxLength: 256 },
    'welcome.dm_message.embed.description': { type: 'string', maxLength: 4096 },
    'welcome.dm_message.embed.color': { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
    // Events
    'events.enabled': { type: 'boolean' },
    'events.check_interval_minutes': { type: 'number', min: 5, max: 1440 },
    'events.fixed_events.double_xp_weekend.enabled': { type: 'boolean' },
    'events.fixed_events.double_xp_weekend.multiplier': { type: 'number', min: 1, max: 10 },
    'events.fixed_events.daily_shop_deals.enabled': { type: 'boolean' },
    'events.fixed_events.daily_shop_deals.max_items': { type: 'number', min: 1, max: 50 },
    'events.fixed_events.daily_shop_deals.discount_percentage': { type: 'number', min: 0, max: 1 },
    'events.random_events.money_rain.enabled': { type: 'boolean' },
    'events.random_events.money_rain.chance': { type: 'number', min: 0, max: 1 },
    'events.random_events.money_rain.duration_minutes': { type: 'number', min: 1, max: 120 },
    'events.random_events.money_rain.min_amount': { type: 'number', min: 1, max: 10000 },
    'events.random_events.money_rain.max_amount': { type: 'number', min: 1, max: 10000 },
    'events.random_events.hot_zone.enabled': { type: 'boolean' },
    'events.random_events.hot_zone.chance': { type: 'number', min: 0, max: 1 },
    'events.random_events.hot_zone.xp_multiplier': { type: 'number', min: 1, max: 10 },
    'events.random_events.enigma_challenge.enabled': { type: 'boolean' },
    'events.random_events.enigma_challenge.chance': { type: 'number', min: 0, max: 1 },
    'events.random_events.diamond_reaction.enabled': { type: 'boolean' },
    'events.random_events.diamond_reaction.chance': { type: 'number', min: 0, max: 1 },
    'events.random_events.diamond_reaction.reward': { type: 'number', min: 1, max: 1000000 },
    // Inactivity
    'inactivity.enabled': { type: 'boolean' },
    'inactivity.inactive_days': { type: 'number', min: 1, max: 365 },
    'inactivity.message.content': { type: 'string', maxLength: 2000 },
    'inactivity.message.embed.title': { type: 'string', maxLength: 256 },
    'inactivity.message.embed.description': { type: 'string', maxLength: 4096 },
    'inactivity.feedback_button.label': { type: 'string', maxLength: 80 },
    'inactivity.feedback_button.style': { type: 'string', enum: ['Primary', 'Secondary', 'Success', 'Danger'] },
    // Profile
    'profile.defaults.about_me': { type: 'string', maxLength: 500 },
    'profile.defaults.color': { type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
    // Quests
    'quests.quests_per_day': { type: 'number', min: 1, max: 10 },
    'quests.rewards.money_multiplier': { type: 'number', min: 0.1, max: 10 },
    'quests.rewards.xp_multiplier': { type: 'number', min: 0.1, max: 10 },
};
/**
 * ConfigService - Gerenciamento centralizado de configurações
 * Suporta tanto arquivos YAML quanto banco de dados (SystemConfig)
 */
export class ConfigService {
    static cache = new Map();
    static getConfig(filename) {
        if (this.cache.has(filename)) {
            return this.cache.get(filename);
        }
        const filePath = join(CONFIG_DIR, filename);
        if (!existsSync(filePath)) {
            logger.warn(`[ConfigService] Arquivo não encontrado: ${filename}`);
            return {};
        }
        try {
            const fileContents = readFileSync(filePath, 'utf8');
            const data = yaml.load(fileContents);
            this.cache.set(filename, data);
            return data;
        }
        catch (error) {
            logger.error(`[ConfigService] Erro ao ler ${filename}:`, error);
            return {};
        }
    }
    /**
     * Salva as configurações em um arquivo YAML
     */
    static saveConfig(filename, data) {
        const filePath = join(CONFIG_DIR, filename);
        try {
            const yamlStr = yaml.dump(data, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
                quotingType: '"',
                forceQuotes: false
            });
            writeFileSync(filePath, yamlStr, 'utf8');
            this.cache.set(filename, data);
            logger.info(`[ConfigService] Configuração salva: ${filename}`);
            return true;
        }
        catch (error) {
            logger.error(`[ConfigService] Erro ao salvar ${filename}:`, error);
            return false;
        }
    }
    /**
     * Atualiza um campo específico em um arquivo de configuração
     * @param filename - Nome do arquivo YAML
     * @param path - Caminho do campo (ex: 'robbery.enabled')
     * @param value - Valor a ser definido
     * @param skipValidation - Pular validação (padrão: false)
     */
    static updateField(filename, path, value, skipValidation = false) {
        // Validar antes de atualizar (se não for pulado)
        if (!skipValidation) {
            const validationKey = `${filename.replace('.yml', '')}.${path}`;
            const validation = this.validate(validationKey, value);
            if (!validation.valid) {
                logger.warn(`[ConfigService] Validação falhou para ${validationKey}: ${validation.error}`);
                return false;
            }
            value = validation.sanitizedValue ?? value;
        }
        const config = this.getConfig(filename);
        const keys = path.split('.');
        let current = config;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]])
                current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return this.saveConfig(filename, config);
    }
    /**
     * Obtém um valor específico de um arquivo de configuração
     */
    static getField(filename, path) {
        const config = this.getConfig(filename);
        const keys = path.split('.');
        let current = config;
        for (const key of keys) {
            if (current === undefined || current === null)
                return undefined;
            current = current[key];
        }
        return current;
    }
    static async getSystemConfig(key) {
        try {
            const record = await prisma.systemConfig.findUnique({ where: { key } });
            if (!record)
                return null;
            return JSON.parse(record.value);
        }
        catch (error) {
            logger.error(`[ConfigService] Erro ao buscar SystemConfig ${key}:`, error);
            return null;
        }
    }
    static async updateSystemConfig(key, value, updatedBy) {
        try {
            // Mesclar com valor existente (para atualizações parciais)
            const existing = await this.getSystemConfig(key);
            const merged = existing ? { ...existing, ...value } : value;
            // Adicionar metadados de auditoria
            const finalValue = {
                ...merged,
                _updatedAt: new Date().toISOString(),
                _updatedBy: updatedBy || 'system'
            };
            await prisma.systemConfig.upsert({
                where: { key },
                update: { value: JSON.stringify(finalValue) },
                create: { key, value: JSON.stringify(finalValue) }
            });
            logger.info(`[ConfigService] SystemConfig atualizado: ${key} por ${updatedBy || 'system'}`);
            return true;
        }
        catch (error) {
            logger.error(`[ConfigService] Erro ao atualizar SystemConfig ${key}:`, error);
            return false;
        }
    }
    /**
     * Deleta uma configuração do banco de dados
     */
    static async deleteSystemConfig(key) {
        try {
            await prisma.systemConfig.delete({ where: { key } });
            logger.info(`[ConfigService] SystemConfig deletado: ${key}`);
            return true;
        }
        catch (error) {
            logger.error(`[ConfigService] Erro ao deletar SystemConfig ${key}:`, error);
            return false;
        }
    }
    // =====================
    // Validation Methods
    // =====================
    /**
     * Valida um valor para um campo específico
     * @param fieldKey - Chave do campo (ex: 'economy.daily.base_amount')
     * @param value - Valor a ser validado
     */
    static validate(fieldKey, value) {
        const rule = FIELD_VALIDATIONS[fieldKey];
        // Se não houver regra definida, aceitar qualquer valor
        if (!rule) {
            return { valid: true, sanitizedValue: value };
        }
        // Validar tipo
        if (rule.type === 'number') {
            const num = Number(value);
            if (isNaN(num)) {
                return { valid: false, error: `Valor deve ser um número` };
            }
            if (rule.min !== undefined && num < rule.min) {
                return { valid: false, error: `Valor mínimo: ${rule.min}` };
            }
            if (rule.max !== undefined && num > rule.max) {
                return { valid: false, error: `Valor máximo: ${rule.max}` };
            }
            return { valid: true, sanitizedValue: num };
        }
        if (rule.type === 'string') {
            const str = String(value);
            if (rule.minLength !== undefined && str.length < rule.minLength) {
                return { valid: false, error: `Mínimo ${rule.minLength} caracteres` };
            }
            if (rule.maxLength !== undefined && str.length > rule.maxLength) {
                return { valid: false, error: `Máximo ${rule.maxLength} caracteres` };
            }
            if (rule.pattern && !rule.pattern.test(str)) {
                return { valid: false, error: `Formato inválido` };
            }
            if (rule.enum && !rule.enum.includes(str)) {
                return { valid: false, error: `Valor deve ser um de: ${rule.enum.join(', ')}` };
            }
            return { valid: true, sanitizedValue: str };
        }
        if (rule.type === 'boolean') {
            if (typeof value === 'boolean') {
                return { valid: true, sanitizedValue: value };
            }
            if (value === 'true' || value === '1') {
                return { valid: true, sanitizedValue: true };
            }
            if (value === 'false' || value === '0') {
                return { valid: true, sanitizedValue: false };
            }
            return { valid: false, error: `Valor deve ser verdadeiro ou falso` };
        }
        if (rule.type === 'array') {
            if (!Array.isArray(value)) {
                return { valid: false, error: `Valor deve ser uma lista` };
            }
            return { valid: true, sanitizedValue: value };
        }
        return { valid: true, sanitizedValue: value };
    }
    /**
     * Verifica se um campo pode ser configurado via /config
     * (tem validação definida)
     */
    static isConfigurable(fieldKey) {
        return fieldKey in FIELD_VALIDATIONS;
    }
    /**
     * Obtém a regra de validação de um campo
     */
    static getValidationRule(fieldKey) {
        return FIELD_VALIDATIONS[fieldKey];
    }
    // =====================
    // Cache Management
    // =====================
    /**
     * Limpa o cache (útil para recarregar do disco forçadamente)
     */
    static clearCache() {
        this.cache.clear();
    }
    /**
     * Recarrega um arquivo específico do disco
     */
    static reloadConfig(filename) {
        this.cache.delete(filename);
        this.getConfig(filename);
    }
}
//# sourceMappingURL=configService.js.map