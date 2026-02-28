/**
 * Re-exports de todas as interfaces de configuração
 */
export * from './economy.js';
export * from './leveling.js';
export * from './ai.js';
export * from './welcome.js';
export * from './events.js';
export * from './inactivity.js';
export * from './permissions.js';
export * from './profile.js';
export * from './quests.js';
export * from './database.js';
/**
 * Mapa de nome de arquivo para tipo de configuração
 */
import type { EconomyConfig } from './economy.js';
import type { LevelingConfig } from './leveling.js';
import type { AIConfig } from './ai.js';
import type { WelcomeConfig } from './welcome.js';
import type { EventsConfig } from './events.js';
import type { InactivityConfig } from './inactivity.js';
import type { PermissionsConfig } from './permissions.js';
import type { ProfileConfig } from './profile.js';
import type { QuestsConfig } from './quests.js';
export interface ConfigFileTypes {
    'economy.yml': EconomyConfig;
    'leveling.yml': LevelingConfig;
    'ai.yml': AIConfig;
    'welcome.yml': WelcomeConfig;
    'events.yml': EventsConfig;
    'inactivity.yml': InactivityConfig;
    'permissions.yml': PermissionsConfig;
    'profile.yml': ProfileConfig;
    'quests.yml': QuestsConfig;
}
export type ConfigFileName = keyof ConfigFileTypes;
