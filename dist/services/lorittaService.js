import { appConfig } from '../shared/config.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { randomUUID } from 'crypto';
export class LorittaService {
    static baseUrl = 'https://loritta.website/api/v1';
    /**
     * Solicita um pagamento de Sonhos via webhook da Loritta no canal.
     * O usuário precisará confirmar o pagamento dentro do Discord.
     *
     * @param guildId ID do Servidor
     * @param channelId ID do Canal onde a Loritta enviará a mensagem de cobrança
     * @param userId ID do Usuário (para fins de registro de idempotência)
     * @param amount Quantidade de Sonhos a cobrar
     * @returns O transactionId gerado para idempotência e rastreamento local
     */
    static async requestDreams(guildId, channelId, userId, amount) {
        const transactionId = randomUUID();
        try {
            // 1. Registrar intenção de cobrança localmente
            await prisma.lorittaTransaction.create({
                data: {
                    id: transactionId,
                    userId,
                    amount,
                    status: 'REQUESTED',
                    idempotencyKey: transactionId
                }
            });
            // 2. Chamar a API da Loritta com retry
            let response;
            let retries = 0;
            const maxRetries = 3;
            while (retries < maxRetries) {
                response = await fetch(`${this.baseUrl}/guilds/${guildId}/channels/${channelId}/sonhos/sonhos-request`, {
                    method: 'POST',
                    headers: {
                        'Authorization': appConfig.loritta.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value: amount })
                });
                if (response.ok || response.status < 500) {
                    break; // Sucesso, erro não retentável (4xx) ou 2xx
                }
                retries++;
                if (retries >= maxRetries)
                    break;
                // Exponential backoff
                const delay = Math.pow(2, retries) * 1000 + Math.random() * 500;
                logger.warn(`[LorittaService] Status ${response.status}. Tentando novamente em ${Math.round(delay)}ms... (${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            if (!response || !response.ok) {
                const errorText = response ? await response.text() : 'Sem resposta';
                const status = response ? response.status : 'Desconhecido';
                logger.error(`[LorittaService] Erro na requisição de sonhos: ${status} - ${errorText}`);
                // Atualizar status da transação para FAILED
                await prisma.lorittaTransaction.update({
                    where: { id: transactionId },
                    data: { status: 'FAILED' }
                });
                throw new Error(`Falha ao comunicar com a Loritta (Status HTTP ${response.status})`);
            }
            logger.info(`[LorittaService] Cobrança de ${amount} sonhos solicitada no canal ${channelId} (tx: ${transactionId})`);
            return transactionId;
        }
        catch (error) {
            logger.error('[LorittaService] Exceção ao solicitar sonhos:', error);
            throw error;
        }
    }
    /**
     * Função para marcar a transação como paga, útil quando temos confirmação
     * (via polling, webhook da API ou validação local de recebimento)
     */
    static async confirmPayment(transactionId) {
        try {
            await prisma.lorittaTransaction.update({
                where: { id: transactionId },
                data: { status: 'PAID' }
            });
            logger.info(`[LorittaService] Transação ${transactionId} confirmada (PAID)`);
        }
        catch (err) {
            logger.error(`[LorittaService] Falha ao confirmar transação ${transactionId}:`, err);
        }
    }
}
//# sourceMappingURL=lorittaService.js.map