/**
 * Config Module: Leveling
 * Configurações de XP, level up, recompensas e fórmulas
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu principal de Leveling
 */
export declare function showLevelingMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Leveling
 */
export declare function handleLevelingInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
