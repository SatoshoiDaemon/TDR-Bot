import { SlashCommandBuilder, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { ShopService } from '../../services/shopService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const inventoryCommand = {
    name: 'inventory',
    description: 'Mostra seus itens conquistados',
    aliases: ['inv', 'mochila'],
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Mostra seus itens conquistados'),
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const member = interactionOrMessage.member;
        const fetchInventory = async () => {
            return await prisma.inventory.findMany({
                where: { userId },
                include: { item: true }
            });
        };
        const inv = await fetchInventory();
        const createEmbed = (items) => {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle(`🎒 Inventário — ${member.user.username}`)
                .setDescription('Aqui estão os itens que você possui. Itens de ativação imediata não aparecem aqui.')
                .setTimestamp();
            if (items.length === 0) {
                embed.setDescription('Seu inventário está vazio. Visite a `/shop` para adquirir novos itens!');
            }
            else {
                items.forEach(slot => {
                    const usableStr = slot.item.isUsable ? ' [Usável]' : '';
                    const expiresStr = slot.expiresAt ? `\n⏳ **Expira em:** <t:${Math.floor(slot.expiresAt.getTime() / 1000)}:R>` : '';
                    embed.addFields({
                        name: `${slot.item.icon || '📦'} ${slot.item.name} x${slot.quantity}${usableStr}`,
                        value: `> ${slot.item.description}${expiresStr}`,
                        inline: false
                    });
                });
            }
            embed.setFooter({ text: EMBED_CREDIT });
            return embed;
        };
        const createRows = (items) => {
            const usableItems = items.filter(slot => slot.item.isUsable);
            if (usableItems.length === 0)
                return [];
            const rows = [];
            const currentRow = new ActionRowBuilder();
            usableItems.slice(0, 5).forEach((slot) => {
                currentRow.addComponents(new ButtonBuilder()
                    .setCustomId(`use_${slot.item.id}`)
                    .setLabel(`Usar ${slot.item.name.substring(0, 15)}`)
                    .setStyle(ButtonStyle.Primary));
            });
            rows.push(currentRow);
            return rows;
        };
        const response = await interactionOrMessage.reply({
            embeds: [createEmbed(inv)],
            components: createRows(inv),
            fetchReply: true
        });
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });
        collector.on('collect', async (i) => {
            try {
                if (i.user.id !== userId) {
                    return await i.reply({ content: '❌ Esta não é sua interface!', flags: MessageFlags.Ephemeral });
                }
                if (i.customId.startsWith('use_')) {
                    const itemId = i.customId.split('_')[1];
                    try {
                        const result = await ShopService.useItem(userId, itemId, member);
                        let successMsg = `✅ Você utilizou **${result.item.name}**!`;
                        if (result.actions?.message) {
                            successMsg = result.actions.message.replace(/{user}/g, member.toString());
                        }
                        await i.reply({ content: successMsg, flags: MessageFlags.Ephemeral });
                        const updatedInv = await fetchInventory();
                        await i.message.edit({ embeds: [createEmbed(updatedInv)], components: createRows(updatedInv) }).catch(() => { });
                    }
                    catch (error) {
                        await i.reply({ content: `❌ Erro ao usar item: ${error.message}`, flags: MessageFlags.Ephemeral });
                    }
                }
            }
            catch (err) {
                logger.error('Erro no collector do Inventory:', err);
            }
        });
        collector.on('end', () => {
            collector.removeAllListeners();
        });
    }
};
//# sourceMappingURL=inventory.js.map