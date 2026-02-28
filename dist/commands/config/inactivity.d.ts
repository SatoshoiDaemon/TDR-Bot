/**
 * Config Module: Inactivity
 * Configurações de Membros Inativos
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Principal de Inatividade
 */
export declare function showInactivityMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Inatividade
 */
export declare function handleInactivityInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
