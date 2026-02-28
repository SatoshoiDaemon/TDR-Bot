import { Interaction } from 'discord.js';
/**
 * Handler centralizado para interações de configuração
 */
export declare class ConfigInteractionHandler {
    /**
     * Processa interações de configuração (botões, menus, modais)
     */
    static handle(interaction: Interaction): Promise<boolean>;
    /**
     * Exibe o menu principal de configurações
     */
    static showMainMenu(interaction: Interaction): Promise<void>;
    /**
     * Handler do menu principal (select menu)
     */
    private static handleMainMenu;
}
