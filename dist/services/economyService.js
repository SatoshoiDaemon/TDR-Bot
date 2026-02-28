import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
/** Garante que o User existe no banco (FK de Economy e Transaction). */
export async function ensureUser(userId, username = 'Unknown') {
    await prisma.user.upsert({
        where: { id: userId },
        update: { username },
        create: { id: userId, username }
    });
}
export class EconomyService {
    static async getBalance(userId, username) {
        const economy = await prisma.economy.findUnique({
            where: { userId }
        });
        if (!economy) {
            await ensureUser(userId, username ?? 'Unknown');
            return await prisma.economy.create({
                data: { userId, wallet: 0, bank: 0 }
            });
        }
        return economy;
    }
    static async addMoney(userId, amount, type = 'wallet', username) {
        await ensureUser(userId, username ?? 'Unknown');
        return await prisma.economy.upsert({
            where: { userId },
            update: {
                [type]: { increment: amount }
            },
            create: {
                userId,
                [type]: amount
            }
        });
    }
    static async transfer(fromId, toId, amount, fromUsername, toUsername) {
        await ensureUser(fromId, fromUsername ?? 'Unknown');
        await ensureUser(toId, toUsername ?? 'Unknown');
        return await prisma.$transaction(async (tx) => {
            const sender = await tx.economy.findUnique({ where: { userId: fromId } });
            if (!sender || sender.wallet < BigInt(amount)) {
                throw new Error('Saldo insuficiente na carteira.');
            }
            await tx.economy.update({
                where: { userId: fromId },
                data: { wallet: { decrement: amount } }
            });
            await tx.economy.upsert({
                where: { userId: toId },
                update: { wallet: { increment: amount } },
                create: { userId: toId, wallet: amount }
            });
            await tx.transaction.create({
                data: {
                    userId: fromId,
                    amount: BigInt(amount),
                    type: 'transfer',
                    status: 'success',
                    description: `Transferência para ${toId}`
                }
            });
        });
    }
    static async daily(userId, guildId) {
        const { economyConfig } = await import('../shared/config/yamlLoader.js');
        const { parseHumanTime } = await import('../shared/utils/timeUtils.js');
        const { LevelService } = await import('./levelService.js');
        // 1. Verificação de Cooldown (Tempo)
        const cooldownMs = parseHumanTime(economyConfig.daily.cooldown);
        const now = new Date();
        const economy = await this.getBalance(userId);
        if (economy.lastDaily) {
            const diff = now.getTime() - economy.lastDaily.getTime();
            if (diff < cooldownMs) {
                return { success: false, remaining: cooldownMs - diff, reason: 'cooldown' };
            }
        }
        // 2. Verificação de Mensagens
        const stats = await prisma.userMessageStats.findUnique({ where: { userId } });
        const messages = stats?.messagesSinceDaily || 0;
        const requiredMessages = economyConfig.daily.required_messages || 0;
        if (requiredMessages > 0 && messages < requiredMessages) {
            return { success: false, reason: 'messages', current: messages, required: requiredMessages };
        }
        // 3. Cálculo das Recompensas (Simplificado sem Orbes)
        const rewards = economyConfig.daily.rewards;
        // Money
        const moneyAmount = Math.floor(Math.random() * (rewards.money_max - rewards.money_min + 1)) + rewards.money_min;
        // XP
        const xpAmount = Math.floor(Math.random() * (rewards.xp_max - rewards.xp_min + 1)) + rewards.xp_min;
        // 3. Aplicação das Recompensas e Reset
        await prisma.$transaction(async (tx) => {
            // Money + LastDaily
            await tx.economy.update({
                where: { userId },
                data: {
                    wallet: { increment: moneyAmount },
                    lastDaily: now
                }
            });
            // XP
            await tx.level.upsert({
                where: { userId },
                update: { xp: { increment: xpAmount } },
                create: { userId, xp: xpAmount, level: 0 }
            });
            // Reset Daily Stats (se existir a tabela)
            try {
                await tx.userMessageStats.update({
                    where: { userId },
                    data: {
                        messagesSinceDaily: 0,
                        lastDailyAt: now
                    }
                });
            }
            catch (e) {
                // Ignora se a tabela não existir ou falhar
            }
        });
        // 4. Incrementar Missão Diária
        if (guildId) {
            try {
                const { QuestService, QuestType } = await import('./questService.js');
                await QuestService.incrementProgress(userId, guildId, QuestType.DAILY, 1);
            }
            catch (e) {
                logger.error(`[Economy] Erro ao incrementar missão diária para ${userId}:`, e);
            }
        }
        return {
            success: true,
            money: moneyAmount,
            xp: xpAmount
        };
    }
    static async collect(userId, memberRoles, username) {
        await ensureUser(userId, username ?? 'Unknown');
        const { economyConfig } = await import('../shared/config/yamlLoader.js');
        const { parseHumanTime } = await import('../shared/utils/timeUtils.js');
        const { redis } = await import('../database/redis.js');
        // Filtrar cargos que o usuário tem e que estão no config
        const availableCollects = economyConfig.collect_roles.filter(cr => memberRoles.includes(cr[1]));
        if (availableCollects.length === 0) {
            return { success: false, error: 'Você não possui cargos que permitem coleta.' };
        }
        let totalCollected = 0;
        let collectedCount = 0;
        for (const [amount, roleId, cooldown] of availableCollects) {
            const cacheKey = `collect_cooldown:${userId}:${roleId}`;
            const onCooldown = await redis.get(cacheKey);
            if (!onCooldown) {
                totalCollected += amount;
                collectedCount++;
                const cooldownMs = parseHumanTime(cooldown);
                await redis.set(cacheKey, '1', 'PX', cooldownMs);
            }
        }
        if (collectedCount === 0) {
            return { success: false, error: 'Todos os seus cargos de coleta estão em cooldown.' };
        }
        await this.addMoney(userId, totalCollected, 'wallet', username);
        return { success: true, amount: totalCollected, count: collectedCount };
    }
    static async deposit(userId, amount, username) {
        await ensureUser(userId, username ?? 'Unknown');
        return await prisma.$transaction(async (tx) => {
            const economy = await tx.economy.findUnique({ where: { userId } });
            const currentWallet = economy ? Number(economy.wallet) : 0;
            let amountToDeposit;
            if (amount === 'all') {
                amountToDeposit = currentWallet;
            }
            else {
                amountToDeposit = amount;
            }
            if (amountToDeposit <= 0) {
                throw new Error('Valor inválido para depósito.');
            }
            if (currentWallet < amountToDeposit) {
                throw new Error(`Você não tem dracmas suficiente na carteira. Atual: ${currentWallet.toLocaleString()} Dracmas`);
            }
            await tx.economy.update({
                where: { userId },
                data: {
                    wallet: { decrement: amountToDeposit },
                    bank: { increment: amountToDeposit }
                }
            });
            await tx.transaction.create({
                data: {
                    userId,
                    amount: BigInt(amountToDeposit),
                    type: 'deposit',
                    status: 'success',
                    description: 'Depósito bancário'
                }
            });
            return { success: true, amount: amountToDeposit, newBalance: currentWallet - amountToDeposit };
        });
    }
    static async withdraw(userId, amount, username) {
        await ensureUser(userId, username ?? 'Unknown');
        return await prisma.$transaction(async (tx) => {
            const economy = await tx.economy.findUnique({ where: { userId } });
            const currentBank = economy ? Number(economy.bank) : 0;
            let amountToWithdraw;
            if (amount === 'all') {
                amountToWithdraw = currentBank;
            }
            else {
                amountToWithdraw = amount;
            }
            if (amountToWithdraw <= 0) {
                throw new Error('Valor inválido para saque.');
            }
            if (currentBank < amountToWithdraw) {
                throw new Error(`Você não tem dracmas suficiente no banco. Atual: ${currentBank.toLocaleString()} Dracmas`);
            }
            await tx.economy.update({
                where: { userId },
                data: {
                    bank: { decrement: amountToWithdraw },
                    wallet: { increment: amountToWithdraw }
                }
            });
            await tx.transaction.create({
                data: {
                    userId,
                    amount: BigInt(amountToWithdraw),
                    type: 'withdraw',
                    status: 'success',
                    description: 'Saque bancário'
                }
            });
            return { success: true, amount: amountToWithdraw, newBalance: currentBank - amountToWithdraw };
        });
    }
}
//# sourceMappingURL=economyService.js.map