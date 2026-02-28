import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { logger } from '../../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const payCommand = {
    name: 'pay',
    description: 'Transfere dracmas da sua carteira para outro usuário',
    aliases: ['pagar', 'transferir'],
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfere dracmas da sua carteira para outro usuário')
        .addUserOption(o => o.setName('user').setDescription('Usuário que receberá o dracmas').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Quantidade a transferir').setRequired(true).setMinValue(1)),
    async execute(interactionOrMessage, client, db, args) {
        const senderId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const senderUsername = interactionOrMessage instanceof Message ? interactionOrMessage.author.username : interactionOrMessage.user.username;
        let target = null;
        let amount = 0;
        if (interactionOrMessage instanceof Message) {
            target = interactionOrMessage.mentions.members?.first() || null;
            amount = parseInt(args?.[1] || '0');
        }
        else {
            target = interactionOrMessage.options.getMember('user');
            amount = interactionOrMessage.options.getInteger('amount', true);
        }
        if (!target || isNaN(amount) || amount <= 0) {
            const msg = '❌ Uso: `rg!pay <@usuário> <valor>`';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        if (target.id === senderId) {
            const msg = '❌ Você não pode pagar a si mesmo.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        if (target.user.bot) {
            const msg = '❌ Você não pode pagar bots.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        try {
            // Buscar economia do remetente
            const senderEconomy = await prisma.economy.findUnique({ where: { userId: senderId } });
            const senderWallet = senderEconomy ? Number(senderEconomy.wallet) : 0;
            if (senderWallet < amount) {
                const msg = `❌ Você não tem dracmas suficiente na carteira. Saldo atual: **${senderWallet.toLocaleString('pt-BR')}**`;
                if (interactionOrMessage instanceof Message)
                    return interactionOrMessage.reply(msg);
                return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            // Executar transação
            await prisma.$transaction([
                // Tirar do remetente
                prisma.economy.update({
                    where: { userId: senderId },
                    data: { wallet: { decrement: BigInt(amount) } }
                }),
                // Dar ao destinatário
                prisma.economy.upsert({
                    where: { userId: target.id },
                    update: { wallet: { increment: BigInt(amount) } },
                    create: { userId: target.id, wallet: BigInt(amount), bank: BigInt(0) }
                }),
                // Registrar transações
                prisma.transaction.create({
                    data: {
                        userId: senderId,
                        amount: BigInt(amount),
                        type: 'transfer',
                        status: 'success',
                        description: `Pagamento enviado para ${target.user.username}`
                    }
                }),
                prisma.transaction.create({
                    data: {
                        userId: target.id,
                        amount: BigInt(amount),
                        type: 'transfer',
                        status: 'success',
                        description: `Pagamento recebido de ${senderUsername}`
                    }
                })
            ]);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('💸 Transferência Realizada')
                .setDescription(`Você enviou **${amount.toLocaleString('pt-BR')}** dracmas para **${target.user.username}**.`)
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            if (interactionOrMessage instanceof Message) {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
            else {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error('Erro ao processar pagamento:', error);
            const msg = '❌ Erro ao processar a transferência.';
            if (interactionOrMessage instanceof Message)
                await interactionOrMessage.reply(msg);
            else
                await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=pay.js.map