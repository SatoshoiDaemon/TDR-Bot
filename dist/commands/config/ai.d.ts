/**
 * Config Module: IA (Igris)
 * Configurações SEGURAS da IA - exclui security, rate_limit, key_management
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu principal de IA
 */
export declare function showAIMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de IA
 */
export declare function handleAIInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
