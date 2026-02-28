import { Guild, VoiceChannel, User, ButtonStyle } from 'discord.js';
/**
 * Serviço de Tickets
 * Gerencia abertura, fechamento e ações de tickets
 */
export declare class TicketService {
    private static readonly FILENAME;
    /**
     * Obtém configuração de tickets do YAML
     * Retorna um objeto compatível com o formato antigo (DB) para manter compatibilidade
     */
    static getConfig(guildId: string): Promise<any>;
    /**
     * Atualiza configuração de tickets no YAML
     */
    static updateConfig(guildId: string, data: {
        staffRoleIds?: string[];
        logsChannelId?: string;
        ratingChannelId?: string;
        defaultCategoryId?: string;
        color?: string;
    }): Promise<any>;
    /**
     * Abre um novo ticket
     */
    static openTicket(guild: Guild, user: User, panelId: string, optionId?: string, subject?: string, description?: string): Promise<{
        existing: boolean;
        channelId: string;
        ticketId?: undefined;
    } | {
        existing: boolean;
        channelId: string;
        ticketId: string;
    }>;
    /**
     * Staff assume o ticket
     */
    static claimTicket(ticketId: string, staffId: string, guild: Guild): Promise<{
        id: string;
        guildId: string;
        channelId: string;
        description: string | null;
        userId: string;
        status: string;
        updatedAt: Date;
        staffId: string | null;
        panelId: string | null;
        optionId: string | null;
        subject: string | null;
        closeReason: string | null;
        closedBy: string | null;
        closedAt: Date | null;
        voiceChannelId: string | null;
        addedUsers: string[];
        openedAt: Date;
    }>;
    /**
     * Fecha o ticket
     */
    static closeTicket(ticketId: string, closedBy: string, guild: Guild, reason?: string): Promise<{
        transcriptUrl: string | undefined;
    }>;
    /**
     * Adiciona usuário ao ticket
     */
    static addUser(ticketId: string, userId: string, guild: Guild): Promise<{
        id: string;
        guildId: string;
        channelId: string;
        description: string | null;
        userId: string;
        status: string;
        updatedAt: Date;
        staffId: string | null;
        panelId: string | null;
        optionId: string | null;
        subject: string | null;
        closeReason: string | null;
        closedBy: string | null;
        closedAt: Date | null;
        voiceChannelId: string | null;
        addedUsers: string[];
        openedAt: Date;
    }>;
    /**
     * Remove usuário do ticket
     */
    static removeUser(ticketId: string, userId: string, guild: Guild): Promise<{
        id: string;
        guildId: string;
        channelId: string;
        description: string | null;
        userId: string;
        status: string;
        updatedAt: Date;
        staffId: string | null;
        panelId: string | null;
        optionId: string | null;
        subject: string | null;
        closeReason: string | null;
        closedBy: string | null;
        closedAt: Date | null;
        voiceChannelId: string | null;
        addedUsers: string[];
        openedAt: Date;
    }>;
    /**
     * Cria canal de voz para o ticket
     */
    static createVoiceChannel(ticketId: string, guild: Guild): Promise<VoiceChannel>;
    /**
     * Deleta canal de voz do ticket
     */
    static deleteVoiceChannel(ticketId: string, guild: Guild): Promise<void>;
    /**
     * Processa avaliação do ticket
     */
    static submitRating(ticketId: string, rating: number, comment: string | null): Promise<{
        createdAt: Date;
        id: number;
        guildId: string;
        userId: string;
        staffId: string | null;
        ticketId: string;
        rating: number;
        comment: string | null;
    }>;
    /**
     * Obtém ticket pelo ID do canal
     */
    static getByChannelId(channelId: string): Promise<{
        id: string;
        guildId: string;
        channelId: string;
        description: string | null;
        userId: string;
        status: string;
        updatedAt: Date;
        staffId: string | null;
        panelId: string | null;
        optionId: string | null;
        subject: string | null;
        closeReason: string | null;
        closedBy: string | null;
        closedAt: Date | null;
        voiceChannelId: string | null;
        addedUsers: string[];
        openedAt: Date;
    } | null>;
    /**
     * Obtém ticket pelo ID
     */
    static getById(ticketId: string): Promise<{
        id: string;
        guildId: string;
        channelId: string;
        description: string | null;
        userId: string;
        status: string;
        updatedAt: Date;
        staffId: string | null;
        panelId: string | null;
        optionId: string | null;
        subject: string | null;
        closeReason: string | null;
        closedBy: string | null;
        closedAt: Date | null;
        voiceChannelId: string | null;
        addedUsers: string[];
        openedAt: Date;
    } | null>;
    /**
     * Atualiza o ID da mensagem do painel
     */
    static updatePanelMessageId(panelId: string, messageId: string): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        messageId: string | null;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
    /**
     * Cria e envia um painel de tickets
     */
    static createPanel(guildId: string, data: {
        channelId: string;
        title: string;
        description: string;
        type: 'button' | 'select';
        placeholder?: string;
        options: Array<{
            label: string;
            emoji?: string;
            style?: ButtonStyle;
            description?: string;
            categoryId?: string;
        }>;
    }): Promise<{
        type: string;
        createdAt: Date;
        id: string;
        guildId: string;
        channelId: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        description: string;
        updatedAt: Date;
        messageId: string | null;
        title: string;
        bannerUrl: string | null;
        askSubject: boolean;
        askDescription: boolean;
        askCloseReason: boolean;
    }>;
}
