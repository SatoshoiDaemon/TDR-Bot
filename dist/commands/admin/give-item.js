import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { PermissionUtils } from '../../shared/utils/permissionUtils.js';
import { logger } from '../../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const giveItemCommand = {
    name: 'give-item',
    description: 'Adiciona um item ao inventário de um usuário',
    aliases: ['give', 'daritem'],
    data: new SlashCommandBuilder()
        .setName('give-item')
        .setDescription('Adiciona um item ao inventário de um usuário')
        .addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true))
        .addStringOption(o => o.setName('item').setDescription('ID ou Nome do item').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Quantidade').setMinValue(1)),
    async execute(interactionOrMessage, client, db, args) {
        const member = interactionOrMessage.member;
        if (!PermissionUtils.isStaff(member)) {
            const msg = '❌ Permissão negada.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        let target = null;
        let itemSearch = '';
        let amount = 1;
        if (interactionOrMessage instanceof Message) {
            target = interactionOrMessage.mentions.members?.first() || null;
            itemSearch = args?.slice(1, -1).join(' ') || args?.[1] || '';
            const lastArg = args?.[args.length - 1];
            amount = lastArg && !isNaN(parseInt(lastArg)) ? parseInt(lastArg) : 1;
            // Se o itemSearch ficou vazio (ex: rg!give @user item), o item é o último arg
            if (!itemSearch && lastArg && isNaN(parseInt(lastArg)))
                itemSearch = lastArg;
        }
        else {
            target = interactionOrMessage.options.getMember('user');
            itemSearch = interactionOrMessage.options.getString('item', true);
            amount = interactionOrMessage.options.getInteger('amount') || 1;
        }
        if (!target || !itemSearch) {
            const msg = '❌ Uso: `rg!give <@usuário> <item> [quantidade]`';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        try {
            // Buscar o item
            const item = await prisma.shopItem.findFirst({
                where: {
                    OR: [
                        { id: itemSearch },
                        { name: { contains: itemSearch, mode: 'insensitive' } }
                    ]
                }
            });
            if (!item) {
                const msg = `❌ Item "**${itemSearch}**" não encontrado.`;
                if (interactionOrMessage instanceof Message)
                    return interactionOrMessage.reply(msg);
                return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            // Adicionar ao inventário
            await prisma.inventory.upsert({
                where: {
                    userId_itemId: {
                        userId: target.id,
                        itemId: item.id
                    }
                },
                update: {
                    quantity: { increment: amount }
                },
                create: {
                    userId: target.id,
                    itemId: item.id,
                    quantity: amount
                }
            });
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('🎁 Item Entregue')
                .setDescription(`Foram entregues **${amount}x ${item.name}** para **${target.user.username}**.`)
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
            logger.error('Erro ao dar item:', error);
            const msg = '❌ Erro ao processar a entrega do item.';
            if (interactionOrMessage instanceof Message)
                await interactionOrMessage.reply(msg);
            else
                await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=give-item.js.map