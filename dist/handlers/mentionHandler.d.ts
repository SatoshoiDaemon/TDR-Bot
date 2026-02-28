import { Message } from 'discord.js';
export declare class MentionHandler {
    /**
     * Verifica se a mensagem é uma menção ao bot
     */
    static isBotMention(message: Message): boolean;
    /**
     * Verifica se é uma resposta a uma mensagem do bot
     */
    static isBotReply(message: Message): boolean;
    /**
     * Processa menção direta ao bot
     */
    static handleMention(message: Message): Promise<void>;
    /**
     * Processa resposta a mensagem do bot
     */
    static handleReply(message: Message): Promise<void>;
    /**
     * Envia resposta quando bot é mencionado sem texto
     */
    private static sendEmptyMentionResponse;
    /**
     * Processa mensagem com IA
     */
    private static processWithAI;
    /**
     * Envia resposta da IA
     */
    private static sendAIResponse;
    /**
     * Handler principal para mensagens
     */
    static handle(message: Message): Promise<boolean>;
}
