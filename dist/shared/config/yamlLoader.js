import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { logger } from '../logger.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Tentar raiz do projeto (dist/shared/config -> ../../..) e depois cwd (hospedagem)
const ROOT_FROM_DIST = join(__dirname, '..', '..', '..');
const CONFIG_CANDIDATES = [
    join(ROOT_FROM_DIST, 'config'),
    join(process.cwd(), 'config'),
    join(process.cwd(), '..', 'config')
];
function findConfigPath(filename) {
    for (const configDir of CONFIG_CANDIDATES) {
        const filePath = join(configDir, filename);
        if (existsSync(filePath))
            return filePath;
    }
    return null;
}
export function loadYamlConfig(filename) {
    const filePath = findConfigPath(filename);
    if (!filePath) {
        logger.warn(`Arquivo não encontrado: ${filename}. Usando padrões.`);
        return {};
    }
    try {
        const fileContents = readFileSync(filePath, 'utf8');
        return yaml.load(fileContents);
    }
    catch (error) {
        logger.error(`Erro ao carregar YAML ${filename}:`, error);
        return {};
    }
}
// Exportar instâncias carregadas
export const permissionsConfig = loadYamlConfig('permissions.yml');
export const levelingConfig = loadYamlConfig('leveling.yml');
export const economyConfig = loadYamlConfig('economy.yml');
export const profileConfig = loadYamlConfig('profile.yml');
export const aiConfig = loadYamlConfig('ai.yml');
export const questConfig = loadYamlConfig('quests.yml');
export const welcomeConfig = loadYamlConfig('welcome.yml');
export const ticketConfig = loadYamlConfig('tickets.yml');
//# sourceMappingURL=yamlLoader.js.map