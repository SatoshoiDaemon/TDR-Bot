/**
 * Config Module: Permissions
 * Configurações de Permissões e Staff
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Principal de Permissões
 */
export declare function showPermissionsMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Permissões
 */
export declare function handlePermissionsInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
