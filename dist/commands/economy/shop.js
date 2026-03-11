import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { ShopService } from '../../services/shopService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
/**
 * Comando Shop - Loja interativa do servidor
 *
 * Funcionalidades:
 * - Navegação por páginas
 * - Compra de itens com verificação de saldo
 * - Itens usáveis e de ativação imediata
 * - Atualização automática de estoque
 * - Interface responsiva
 */
export const shopCommand = {
    name: 'shop',
    description: 'Abre a loja do servidor',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Abre a loja do servidor'),
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const member = interactionOrMessage.member;
        let currentPage = 0;
        const itemsPerPage = 3;
        /**
         * Busca itens da loja com paginação
         */
        const fetchItems = async (page) => {
            return await prisma.shopItem.findMany({
                skip: page * itemsPerPage,
                take: itemsPerPage,
                orderBy: { createdAt: 'desc' }
            });
        };
        const totalItems = await prisma.shopItem.count();
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        /**
         * Cria o embed da loja
         */
        const createShopEmbed = (items, page) => {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('🏪 Loja Imperial — Trono dos Reis')
                .setDescription('✨ Adquira cargos, bônus e itens exclusivos para sua jornada!')
                .setFooter({ text: `Página ${page + 1} de ${totalPages || 1} • ${EMBED_CREDIT}` })
                .setTimestamp();
            if (items.length === 0) {
                embed.setDescription('📭 A loja está vazia no momento. Volte mais tarde!');
            }
            items.forEach(item => {
                const stockStr = item.stock === null ? '∞' : item.stock;
                const icon = item.icon || '📦';
                const typeStr = item.isUsable ? '🛠️ Usável' : '⚡ Ativação Imediata';
                embed.addFields({
                    name: `${icon} ${item.name}`,
                    value: `> ${item.description}\n💰 **Preço:** \`${item.price.toLocaleString()} Dracmas\` | 📦 **Estoque:** \`${stockStr}\`\n✨ **Tipo:** ${typeStr}`,
                    inline: false
                });
            });
            return embed;
        };
        /**
         * Cria os componentes (botões) da interface
         */
        const createComponents = (items, page) => {
            const rows = [];
            // Botões de compra (um para cada item)
            if (items.length > 0) {
                const buyRow = new ActionRowBuilder();
                items.forEach((item) => {
                    buyRow.addComponents(new ButtonBuilder()
                        .setCustomId(`buy_${item.id}`)
                        .setLabel(`Comprar ${item.name.substring(0, 15)}`)
                        .setStyle(ButtonStyle.Success));
                });
                rows.push(buyRow);
            }
            // Botões de navegação
            const navRow = new ActionRowBuilder();
            navRow.addComponents(new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️ Anterior')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0), new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Próximo ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1 || totalPages === 0));
            rows.push(navRow);
            return rows;
        };
        // Enviar interface inicial
        const initialItems = await fetchItems(currentPage);
        const response = await interactionOrMessage.reply({
            embeds: [createShopEmbed(initialItems, currentPage)],
            components: createComponents(initialItems, currentPage),
            fetchReply: true
        });
        logger.info(`[Shop] ${userId} abriu a loja (página ${currentPage + 1})`);
        // Collector para interações (5 minutos)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });
        // Flag para evitar múltiplas compras simultâneas
        let isProcessingPurchase = false;
        collector.on('collect', async (i) => {
            try {
                // Verificar se é o usuário correto
                if (i.user.id !== userId) {
                    return await i.reply({ content: '❌ Esta não é sua interface!', flags: MessageFlags.Ephemeral });
                }
                // Navegação - Página anterior
                if (i.customId === 'prev_page') {
                    currentPage--;
                    const items = await fetchItems(currentPage);
                    await i.update({
                        embeds: [createShopEmbed(items, currentPage)],
                        components: createComponents(items, currentPage)
                    });
                    logger.info(`[Shop] ${userId} navegou para página ${currentPage + 1}`);
                }
                // Navegação - Próxima página
                else if (i.customId === 'next_page') {
                    currentPage++;
                    const items = await fetchItems(currentPage);
                    await i.update({
                        embeds: [createShopEmbed(items, currentPage)],
                        components: createComponents(items, currentPage)
                    });
                    logger.info(`[Shop] ${userId} navegou para página ${currentPage + 1}`);
                }
                // Compra de item
                else if (i.customId.startsWith('buy_')) {
                    // Evitar compras simultâneas
                    if (isProcessingPurchase) {
                        return await i.reply({
                            content: '⏳ Aguarde o processamento da compra anterior...',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    isProcessingPurchase = true;
                    try {
                        const itemId = i.customId.split('_')[1];
                        // Processar compra
                        const item = await ShopService.buyItem(userId, itemId, member);
                        // Mensagem de sucesso personalizada
                        let successMsg = `✅ Você comprou **${item.name}** com sucesso!`;
                        if (!item.isUsable && item.actions?.message) {
                            successMsg = item.actions.message.replace(/{user}/g, member.toString());
                        }
                        // Responder ao usuário
                        await i.reply({ content: successMsg, flags: MessageFlags.Ephemeral });
                        logger.info(`[Shop] ${userId} comprou item ${item.id} (${item.name})`);
                        // Atualizar interface com estoque atualizado
                        try {
                            const items = await fetchItems(currentPage);
                            await i.message.edit({
                                embeds: [createShopEmbed(items, currentPage)],
                                components: createComponents(items, currentPage)
                            });
                        }
                        catch (editErr) {
                            logger.error('[Shop] Erro ao atualizar interface após compra:', editErr);
                        }
                    }
                    catch (error) {
                        // Erro na compra (saldo insuficiente, estoque esgotado, etc)
                        logger.warn(`[Shop] Erro na compra de ${userId}:`, error.message);
                        try {
                            if (!i.replied && !i.deferred) {
                                await i.reply({ content: `❌ Erro na compra: ${error.message}`, flags: MessageFlags.Ephemeral });
                            }
                            else {
                                await i.followUp({ content: `❌ Erro na compra: ${error.message}`, flags: MessageFlags.Ephemeral });
                            }
                        }
                        catch (replyErr) {
                            logger.error('[Shop] Erro ao enviar mensagem de erro:', replyErr);
                        }
                    }
                    finally {
                        isProcessingPurchase = false;
                    }
                }
            }
            catch (err) {
                logger.error('[Shop] Erro no collector:', err);
                // Tentar responder com mensagem de erro
                try {
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
                    }
                }
                catch (replyErr) {
                    logger.error('[Shop] Erro ao enviar mensagem de erro:', replyErr);
                }
            }
        });
        collector.on('end', (_collected, reason) => {
            collector.removeAllListeners();
            if (reason === 'time') {
                logger.info(`[Shop] Collector de ${userId} expirou por timeout`);
            }
        });
    }
};
//# sourceMappingURL=shop.js.map