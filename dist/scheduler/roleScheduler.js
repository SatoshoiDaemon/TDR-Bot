import cron from 'node-cron';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
/**
 * RoleScheduler - Gerenciamento de cargos temporários
 *
 * Funcionalidades:
 * - Verifica periodicamente (a cada 5 minutos) itens expirados no inventário
 * - Remove cargos de usuários cujos itens temporários expiraram
 * - Limpa registros expirados do banco de dados
 */
export class RoleScheduler {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Inicia o agendamento da verificação
     */
    start() {
        // Executa a cada 5 minutos
        cron.schedule('*/5 * * * *', async () => {
            await this.checkExpiredRoles();
        });
        logger.info('✅ Role Scheduler iniciado (verificação a cada 5 minutos)');
    }
    /**
     * Verifica e remove cargos expirados
     */
    async checkExpiredRoles() {
        try {
            const now = new Date();
            // 1. Buscar itens de inventário expirados que possuem ações de cargo
            const expiredItems = await prisma.inventory.findMany({
                where: {
                    expiresAt: { lt: now }
                },
                include: {
                    item: true
                }
            });
            if (expiredItems.length === 0)
                return;
            logger.info(`[RoleScheduler] Verificando ${expiredItems.length} itens expirados...`);
            for (const inv of expiredItems) {
                try {
                    const guild = this.client.guilds.cache.first(); // Assume que o bot está em um servidor principal ou itera
                    if (!guild)
                        continue;
                    const member = await guild.members.fetch(inv.userId).catch(() => null);
                    const actions = inv.item.actions;
                    if (member && actions) {
                        // Remover cargos permanentes que foram adicionados pelo item
                        if (actions.addRoles?.length) {
                            for (const roleId of actions.addRoles) {
                                if (member.roles.cache.has(roleId)) {
                                    await member.roles.remove(roleId).catch(e => logger.error(`[RoleScheduler] Erro ao remover cargo ${roleId} de ${member.id}:`, e));
                                }
                            }
                        }
                        // Remover cargos temporários específicos
                        if (actions.tempRoles?.length) {
                            for (const temp of actions.tempRoles) {
                                if (member.roles.cache.has(temp.roleId)) {
                                    await member.roles.remove(temp.roleId).catch(e => logger.error(`[RoleScheduler] Erro ao remover cargo temporário ${temp.roleId} de ${member.id}:`, e));
                                }
                            }
                        }
                        logger.info(`[RoleScheduler] Cargos removidos do usuário ${inv.userId} devido à expiração do item ${inv.item.name}`);
                    }
                    // 2. Remover o item do inventário após processar a remoção dos cargos
                    await prisma.inventory.delete({
                        where: { id: inv.id }
                    });
                }
                catch (itemError) {
                    logger.error(`[RoleScheduler] Erro ao processar item expirado ${inv.id}:`, itemError);
                }
            }
        }
        catch (error) {
            logger.error('[RoleScheduler] Erro crítico na verificação de cargos expirados:', error);
        }
    }
}
//# sourceMappingURL=roleScheduler.js.map