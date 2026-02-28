/**
 * Config Module: Quests
 * Configurações de Missões Diárias
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Principal de Quests
 */
export declare function showQuestsMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Quests
 */
export declare function handleQuestsInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
