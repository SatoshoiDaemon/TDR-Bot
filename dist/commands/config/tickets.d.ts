/**
 * Config Module: Tickets
 * Configurações de Tickets com Wizard UI (Multi-Type Support)
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Ticket Principal
 */
export declare function showTicketMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Tickets
 */
export declare function handleTicketInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
