/**
 * Config Module: Profile
 * Configurações de Perfil
 */
import { type MessageComponentInteraction, type ModalSubmitInteraction } from 'discord.js';
/**
 * Menu Principal de Perfil
 */
export declare function showProfileMenu(interaction: any, backHandler?: any): Promise<void>;
/**
 * Handler Central para Interações de Perfil
 */
export declare function handleProfileInteraction(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void>;
