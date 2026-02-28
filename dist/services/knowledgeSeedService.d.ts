import { Client } from 'discord.js';
export declare class KnowledgeSeedService {
    /**
     * Popula o banco de dados com conhecimento dos sistemas do servidor
     */
    static seedFromChannels(client: Client, guildId: string): Promise<void>;
    /**
     * Popula conhecimento com dados manuais (fallback)
     */
    static seedManualKnowledge(): Promise<void>;
    /**
     * Limpa o nome do canal de emojis, símbolos e fontes especiais
     */
    /**
     * Limpa o nome do canal de emojis, símbolos e fontes especiais
     */
    private static sanitizeChannelName;
    /**
     * Processa mensagens de um canal ou tópico e salva no banco
     */
    private static processChannelMessages;
    /**
     * Extrai categoria do nome do canal (suporta nomes decorados)
     */
    private static extractCategory;
    /**
     * Extrai keywords do conteúdo (limpando Markdown e decorações)
     */
    private static extractKeywords;
    /**
     * Gera título do conteúdo
     */
    private static generateTitle;
    /**
     * Sanitiza conteúdo para remover caracteres inválidos para o banco (null bytes, escapes quebrados)
     */
    private static sanitizeContent;
    /**
     * Limpa conhecimento antigo
     */
    static clearKnowledge(): Promise<void>;
}
