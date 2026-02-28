/**
 * Config Module: Welcome (Boas-vindas)
 * Configurações de entrada de novos membros
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu principal de Boas-vindas
 */
export declare function showWelcomeMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Welcome
 */
export declare function handleWelcomeInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
