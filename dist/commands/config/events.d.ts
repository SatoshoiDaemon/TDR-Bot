/**
 * Config Module: Events
 * Configurações de Eventos Fixos e Aleatórios
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Principal de Eventos
 */
export declare function showEventsMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Eventos
 */
export declare function handleEventsInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
