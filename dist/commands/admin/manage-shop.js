import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { PermissionUtils } from '../../shared/utils/permissionUtils.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const manageShopCommand = {
    name: 'manage-shop',
    description: 'Gerencia os itens da loja e suas ações',
    data: new SlashCommandBuilder()
        .setName('manage-shop')
        .setDescription('Gerencia os itens da loja e suas ações'),
    async execute(interaction) {
        if (!PermissionUtils.isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Permissão negada.', flags: MessageFlags.Ephemeral });
        }
        await this.showDashboard(interaction);
    },
    async showDashboard(interaction, page = 0) {
        const items = await prisma.shopItem.findMany({
            orderBy: { createdAt: 'desc' }
        });
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('🏪 Gerenciamento da Loja')
            .setDescription(items.length === 0 ? 'Nenhum item cadastrado.' : `Existem **${items.length}** itens na loja.`)
            .setFooter({ text: EMBED_CREDIT });
        if (items.length > 0) {
            if (page < 0)
                page = 0;
            if (page >= items.length)
                page = items.length - 1;
            const item = items[page];
            const actions = item.actions;
            let actionsSummary = 'Nenhuma ação configurada.';
            if (actions) {
                const summary = [];
                if (actions.message)
                    summary.push(`💬 Msg: ${actions.message.substring(0, 30)}...`);
                if (actions.addRoles?.length)
                    summary.push(`➕ Cargos: ${actions.addRoles.length}`);
                if (actions.addMoney)
                    summary.push(`💰 Dracmas: ${actions.addMoney}`);
                if (actions.addXp)
                    summary.push(`✨ XP: ${actions.addXp}`);
                if (actions.badge)
                    summary.push(`🏅 Badge: ${actions.badge.name}`);
                if (summary.length)
                    actionsSummary = summary.join('\n');
            }
            embed.addFields({ name: '📍 Item Atual', value: `**${item.name}** (ID: \`${item.id.substring(0, 8)}\`)`, inline: true }, { name: '💰 Preço', value: `${item.price.toLocaleString()} Dracmas`, inline: true }, { name: '🛠️ Tipo', value: item.isUsable ? 'Usável' : 'Ativação Imediata', inline: true }, { name: '📝 Descrição', value: item.description || 'Sem descrição.' }, { name: '⚡ Ações', value: actionsSummary });
        }
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(`shop_prev_${page}`)
            .setLabel('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0 || items.length === 0), new ButtonBuilder()
            .setCustomId(`shop_next_${page}`)
            .setLabel('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= items.length - 1 || items.length === 0), new ButtonBuilder()
            .setCustomId('shop_create')
            .setLabel('Novo Item')
            .setStyle(ButtonStyle.Success), new ButtonBuilder()
            .setCustomId(`shop_edit_${page}`)
            .setLabel('Configurar Ações')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(items.length === 0), new ButtonBuilder()
            .setCustomId(`shop_delete_${page}`)
            .setLabel('Excluir')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(items.length === 0));
        let response;
        if (interaction.replied || interaction.deferred) {
            response = await interaction.editReply({ embeds: [embed], components: [row] });
        }
        else {
            response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        }
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });
        collector.on('collect', async (i) => {
            try {
                if (i.user.id !== (interaction.user?.id || interaction.author?.id)) {
                    return await i.reply({ content: 'Apenas quem usou o comando pode interagir.', flags: MessageFlags.Ephemeral });
                }
                if (i.customId.startsWith('shop_next')) {
                    collector.stop();
                    return await this.showDashboard(i, page + 1);
                }
                if (i.customId.startsWith('shop_prev')) {
                    collector.stop();
                    return await this.showDashboard(i, page - 1);
                }
                if (i.customId === 'shop_create') {
                    collector.stop();
                    return await this.handleCreateModal(i);
                }
                if (i.customId.startsWith('shop_edit')) {
                    collector.stop();
                    return await this.handleEditActions(i, items[page]);
                }
                if (i.customId.startsWith('shop_delete')) {
                    await prisma.shopItem.delete({ where: { id: items[page].id } });
                    collector.stop();
                    await i.reply({ content: '✅ Item excluído.', flags: MessageFlags.Ephemeral });
                    return await this.showDashboard(interaction, 0);
                }
            }
            catch (err) {
                logger.error('Erro no dashboard da loja:', err);
            }
        });
    },
    async handleCreateModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modal_create_item')
            .setTitle('Criar Novo Item');
        const nameInput = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Nome do Item')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        const priceInput = new TextInputBuilder()
            .setCustomId('price')
            .setLabel('Preço (Número)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        const usableInput = new TextInputBuilder()
            .setCustomId('isUsable')
            .setLabel('Usável? (sim/nao)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('sim = vai para o inventário | nao = ativa na compra');
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(priceInput), new ActionRowBuilder().addComponents(descInput), new ActionRowBuilder().addComponents(usableInput));
        await interaction.showModal(modal);
        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (submitted) {
            const name = submitted.fields.getTextInputValue('name');
            const price = parseInt(submitted.fields.getTextInputValue('price')) || 0;
            const description = submitted.fields.getTextInputValue('description');
            const isUsable = submitted.fields.getTextInputValue('isUsable').toLowerCase() === 'sim';
            await prisma.shopItem.create({
                data: { name, price, description, isUsable }
            });
            await submitted.reply({ content: '✅ Item criado! Agora configure as ações.', flags: MessageFlags.Ephemeral });
            return this.showDashboard(submitted, 0);
        }
    },
    async handleEditActions(interaction, item) {
        const modal = new ModalBuilder()
            .setCustomId('modal_edit_actions')
            .setTitle(`Ações: ${item.name}`);
        const msgInput = new TextInputBuilder()
            .setCustomId('message')
            .setLabel('Mensagem ao usar/comprar')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Ex: {user} acaba de se tornar um Nobre!');
        const rolesInput = new TextInputBuilder()
            .setCustomId('addRoles')
            .setLabel('IDs dos Cargos para Adicionar')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('ID1, ID2, ID3');
        const moneyInput = new TextInputBuilder()
            .setCustomId('addMoney')
            .setLabel('Dracmas para Adicionar')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Ex: 5000');
        const xpInput = new TextInputBuilder()
            .setCustomId('addXp')
            .setLabel('XP para Adicionar')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Ex: 1000');
        const badgeInput = new TextInputBuilder()
            .setCustomId('badge')
            .setLabel('Badge (Nome:Emoji)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Ex: Pioneiro:🥇');
        modal.addComponents(new ActionRowBuilder().addComponents(msgInput), new ActionRowBuilder().addComponents(rolesInput), new ActionRowBuilder().addComponents(moneyInput), new ActionRowBuilder().addComponents(xpInput), new ActionRowBuilder().addComponents(badgeInput));
        await interaction.showModal(modal);
        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (submitted) {
            const message = submitted.fields.getTextInputValue('message');
            const addRoles = submitted.fields.getTextInputValue('addRoles').split(',').map((s) => s.trim()).filter((s) => s);
            const addMoney = parseInt(submitted.fields.getTextInputValue('addMoney')) || 0;
            const addXp = parseInt(submitted.fields.getTextInputValue('addXp')) || 0;
            const badgeRaw = submitted.fields.getTextInputValue('badge');
            let badge = null;
            if (badgeRaw.includes(':')) {
                const [name, icon] = badgeRaw.split(':');
                badge = { name: name.trim(), icon: icon.trim() };
            }
            const actions = { message, addRoles, addMoney, addXp, badge };
            await prisma.shopItem.update({
                where: { id: item.id },
                data: { actions }
            });
            await submitted.reply({ content: '✅ Ações configuradas com sucesso!', flags: MessageFlags.Ephemeral });
            return this.showDashboard(submitted, 0);
        }
    }
};
//# sourceMappingURL=manage-shop.js.map