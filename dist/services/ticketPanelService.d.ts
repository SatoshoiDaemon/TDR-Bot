import { Guild, EmbedBuilder, ActionRowBuilder } from 'discord.js';
/**
 * Interface para opções de painel
 */
interface PanelOption {
    id: string;
    label: string;
    emoji?: string;
    description?: string;
    categoryId?: string;
    welcomeMessage?: string;
}
/**
 * Serviço de Painéis de Ticket
 * Gerencia criação, edição e envio de painéis
 */
export declare class TicketPanelService {
    /**
     * Cria um novo painel de ticket
     */
    static createPanel(guildId: string, data: {
        title: string;
        description: string;
        bannerUrl?: string;
        type?: 'button' | 'select';
        askSubject?: boolean;
        askDescription?: boolean;
        askCloseReason?: boolean;
        options: PanelOption[];
    }): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Atualiza um painel existente
     */
    static updatePanel(panelId: string, data: Partial<{
        title: string;
        description: string;
        bannerUrl: string | null;
        type: 'button' | 'select';
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
        options: PanelOption[];
    }>): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Deleta um painel
     */
    static deletePanel(panelId: string): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Lista todos os painéis de um servidor
     */
    static listPanels(guildId: string): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }[]>;
    /**
     * Obtém um painel pelo ID
     */
    static getPanel(panelId: string): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    } | null>;
    /**
     * Envia o painel para um canal
     */
    static sendPanel(panelId: string, guild: Guild, channelId: string): Promise<import("discord.js").Message<true>>;
    /**
     * Constrói o embed do painel
     */
    static buildPanelEmbed(panel: any): EmbedBuilder;
    /**
     * Constrói os componentes (botões/select) do painel
     */
    static buildPanelComponents(panel: any): ActionRowBuilder<any>[];
    /**
     * Adiciona uma opção ao painel
     */
    static addOption(panelId: string, option: PanelOption): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Remove uma opção do painel
     */
    static removeOption(panelId: string, optionId: string): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        messageId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Atualiza a mensagem do painel no canal
     */
    static refreshPanelMessage(panelId: string, guild: Guild): Promise<import("discord.js").Message<true> | null>;
}
export {};
