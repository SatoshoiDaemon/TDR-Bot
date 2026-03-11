export declare class LorittaService {
    private static baseUrl;
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
    static requestDreams(guildId: string, channelId: string, userId: string, amount: number): Promise<string>;
    /**
     * Função para marcar a transação como paga, útil quando temos confirmação
     * (via polling, webhook da API ou validação local de recebimento)
     */
    static confirmPayment(transactionId: string): Promise<void>;
}
