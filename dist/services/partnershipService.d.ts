import { Message } from 'discord.js';
/**
 * Serviço de Parcerias
 *
 * Funcionalidades:
 * - Detecção automática de convites do Discord
 * - Contabilização de parcerias por staff
 * - Sistema de ranking de parceiros
 * - Notificações automáticas
 * - Atribuição de cargos
 */
export declare class PartnershipService {
    /**
     * Detecta e processa convites de Discord em mensagens
     * Incrementa estatísticas e envia notificações
     */
    static handleInviteDetection(message: Message): Promise<void>;
    /**
     * Retorna o ranking de parcerias (top 10)
     */
    static getRanking(): Promise<{
        userId: string;
        totalPartners: number;
        lastPartnerAt: Date;
    }[]>;
    /**
     * Processa análise de pedidos de parceria (aprovação/rejeição)
     */
    static handleAnalysis(interaction: any): Promise<any>;
}
