import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { ensureUser } from './economyService.js';
export class ShopService {
    static async buyItem(userId, itemId, member) {
        await ensureUser(userId, member.user.username);
        return await prisma.$transaction(async (tx) => {
            const item = await tx.shopItem.findUnique({ where: { id: itemId } });
            if (!item)
                throw new Error('Item não encontrado.');
            if (item.stock !== null && item.stock <= 0)
                throw new Error('Item fora de estoque.');
            const economy = await tx.economy.findUnique({ where: { userId } });
            const totalMoney = Number((economy?.wallet || 0n) + (economy?.bank || 0n));
            if (totalMoney < item.price)
                throw new Error('Saldo insuficiente (considerando carteira + banco).');
            // Validar Requisitos
            const reqs = item.requirements;
            if (reqs) {
                if (reqs.roles?.length && !reqs.roles.some(r => member.roles.cache.has(r)))
                    throw new Error('Você não possui os cargos necessários.');
                if (reqs.minLevel) {
                    const levelData = await tx.level.findUnique({ where: { userId } });
                    if ((levelData?.level || 0) < reqs.minLevel)
                        throw new Error(`Nível insuficiente (Mínimo: ${reqs.minLevel}).`);
                }
                if (reqs.minServerTime) {
                    const daysInServer = (Date.now() - (member.joinedTimestamp || Date.now())) / (1000 * 60 * 60 * 24);
                    if (daysInServer < reqs.minServerTime)
                        throw new Error(`Tempo de servidor insuficiente (Mínimo: ${reqs.minServerTime} dias).`);
                }
            }
            // Descontar dracmas
            let remainingToPay = BigInt(item.price);
            let walletUpdate = economy.wallet;
            let bankUpdate = economy.bank;
            if (walletUpdate >= remainingToPay) {
                walletUpdate -= remainingToPay;
            }
            else {
                remainingToPay -= walletUpdate;
                walletUpdate = 0n;
                bankUpdate -= remainingToPay;
            }
            await tx.economy.update({
                where: { userId },
                data: { wallet: walletUpdate, bank: bankUpdate }
            });
            // Atualizar Estoque
            if (item.stock !== null) {
                await tx.shopItem.update({
                    where: { id: itemId },
                    data: { stock: { decrement: 1 } }
                });
            }
            // Se o item for usável, ele vai para o inventário. 
            // Se não for usável, as ações são executadas IMEDIATAMENTE na compra.
            if (item.isUsable) {
                await tx.inventory.upsert({
                    where: { userId_itemId: { userId, itemId } },
                    update: { quantity: { increment: 1 } },
                    create: { userId, itemId, quantity: 1 }
                });
            }
            else {
                await this.executeActions(tx, userId, item.actions, member);
            }
            // Registrar Transação
            await tx.transaction.create({
                data: {
                    userId,
                    amount: BigInt(item.price),
                    type: 'buy',
                    status: 'success',
                    description: `Comprou item: ${item.name}`
                }
            });
            return item;
        });
    }
    static async useItem(userId, itemId, member) {
        return await prisma.$transaction(async (tx) => {
            const inv = await tx.inventory.findUnique({
                where: { userId_itemId: { userId, itemId } },
                include: { item: true }
            });
            if (!inv || inv.quantity <= 0)
                throw new Error('Você não possui este item.');
            if (!inv.item.isUsable)
                throw new Error('Este item não pode ser usado manualmente.');
            // Executar Ações
            const actions = inv.item.actions;
            await this.executeActions(tx, userId, actions, member);
            // Consumir item
            if (inv.quantity > 1) {
                await tx.inventory.update({
                    where: { userId_itemId: { userId, itemId } },
                    data: { quantity: { decrement: 1 } }
                });
            }
            else {
                await tx.inventory.delete({ where: { userId_itemId: { userId, itemId } } });
            }
            return { item: inv.item, actions };
        });
    }
    static async executeActions(tx, userId, actions, member) {
        if (!actions)
            return;
        // 1. Cargos Permanentes
        if (actions.addRoles?.length) {
            for (const roleId of actions.addRoles) {
                await member.roles.add(roleId).catch(e => logger.error(`Erro ao adicionar cargo ${roleId}:`, e));
            }
        }
        if (actions.removeRoles?.length) {
            for (const roleId of actions.removeRoles) {
                await member.roles.remove(roleId).catch(e => logger.error(`Erro ao remover cargo ${roleId}:`, e));
            }
        }
        // 2. Cargos Temporários (Lógica simplificada: adiciona agora, um scheduler deve remover depois)
        if (actions.tempRoles?.length) {
            for (const temp of actions.tempRoles) {
                await member.roles.add(temp.roleId).catch(e => logger.error(`Erro ao adicionar cargo temporário ${temp.roleId}:`, e));
                // Registrar no inventário como um item de controle temporário para que o RoleScheduler remova depois
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + temp.duration);
                await tx.inventory.upsert({
                    where: { userId_itemId: { userId, itemId: `temp_role_${temp.roleId}` } },
                    update: { expiresAt },
                    create: {
                        userId,
                        itemId: `temp_role_${temp.roleId}`,
                        expiresAt,
                        quantity: 1
                    }
                }).catch((e) => logger.error(`[ShopService] Erro ao registrar cargo temporário no inventário:`, e));
            }
        }
        // 3. Economia e XP
        if (actions.addMoney) {
            await tx.economy.update({
                where: { userId },
                data: { wallet: { increment: BigInt(actions.addMoney) } }
            });
        }
        if (actions.addXp) {
            await tx.level.upsert({
                where: { userId },
                update: { xp: { increment: actions.addXp } },
                create: { userId, xp: actions.addXp, level: 0 }
            });
        }
        // 4. Badges
        if (actions.badge) {
            await tx.userBadge.upsert({
                where: { userId_name: { userId, name: actions.badge.name } },
                update: { icon: actions.badge.icon },
                create: { userId, name: actions.badge.name, icon: actions.badge.icon }
            });
        }
    }
}
//# sourceMappingURL=shopService.js.map