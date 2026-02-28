import { Client } from 'discord.js';
/**
 * RoleScheduler - Gerenciamento de cargos temporários
 *
 * Funcionalidades:
 * - Verifica periodicamente (a cada 5 minutos) itens expirados no inventário
 * - Remove cargos de usuários cujos itens temporários expiraram
 * - Limpa registros expirados do banco de dados
 */
export declare class RoleScheduler {
    private client;
    constructor(client: Client);
    /**
     * Inicia o agendamento da verificação
     */
    start(): void;
    /**
     * Verifica e remove cargos expirados
     */
    checkExpiredRoles(): Promise<void>;
}
