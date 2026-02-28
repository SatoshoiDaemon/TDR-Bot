/**
 * Config Module: Economia
 * Configurações de economia: daily, robbery, bets, collect_roles
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu principal de Economia
 */
export declare function showEconomyMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Economia
 * Chamado pelo ConfigInteractionHandler
 */
export declare function handleEconomyInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
