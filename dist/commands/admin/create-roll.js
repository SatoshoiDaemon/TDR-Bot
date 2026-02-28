import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { PermissionUtils } from '../../shared/utils/permissionUtils.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
/**
 * Comando Create-Roll - Sistema de gerenciamento de rolls dinâmicos
 *
 * Funcionalidades:
 * - Dashboard interativa com navegação
 * - Criação de novos rolls com gatilhos personalizados
 * - Edição e exclusão de rolls existentes
 * - Gerenciamento de opções com pesos
 * - Sistema de collectors otimizado sem memory leaks
 */
export const createRollCommand = {
    name: 'create-roll',
    description: 'Gerencia o sistema de Rolls dinâmicos',
    data: new SlashCommandBuilder()
        .setName('create-roll')
        .setDescription('Gerencia o sistema de Rolls dinâmicos'),
    async execute(interaction) {
        // Verificação de permissão
        if (!PermissionUtils.isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Permissão negada.', flags: MessageFlags.Ephemeral });
        }
        await this.showDashboard(interaction);
    },
    /**
     * Exibe a dashboard principal de gerenciamento de rolls
     * @param interaction - Interação atual
     * @param page - Página atual (índice do roll)
     */
    async showDashboard(interaction, page = 0) {
        // Buscar todos os rolls do banco
        const rolls = await prisma.roll.findMany({
            include: { options: true },
            orderBy: { createdAt: 'desc' }
        });
        // Garantir que a página está dentro dos limites
        if (page < 0)
            page = 0;
        if (rolls.length > 0 && page >= rolls.length)
            page = rolls.length - 1;
        // Criar embed da dashboard
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('🎲 Dashboard de Rolls')
            .setDescription(rolls.length === 0
            ? '📋 Nenhum roll configurado. Clique em **Novo Roll** para começar!'
            : `📊 Você tem **${rolls.length}** roll(s) configurado(s).`)
            .setFooter({ text: `${EMBED_CREDIT} · Página ${page + 1}/${rolls.length || 1}` });
        // Se houver rolls, mostrar detalhes do roll atual
        if (rolls.length > 0) {
            const currentRoll = rolls[page];
            const optionsText = currentRoll.options.length > 0
                ? currentRoll.options.map((o) => `• ${o.text.substring(0, 50)}${o.text.length > 50 ? '...' : ''} (Peso: ${o.weight})`).join('\n')
                : '⚠️ Nenhuma opção configurada.';
            embed.addFields({ name: '📍 Roll Atual', value: `**${currentRoll.title}**\nGatilho: \`${currentRoll.trigger}\`` }, { name: `📝 Opções (${currentRoll.options.length})`, value: optionsText.substring(0, 1024) });
        }
        // Criar botões de controle
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(`roll_prev`)
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0 || rolls.length === 0), new ButtonBuilder()
            .setCustomId(`roll_next`)
            .setLabel('Próximo ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= rolls.length - 1 || rolls.length === 0), new ButtonBuilder()
            .setCustomId('roll_create')
            .setLabel('➕ Novo Roll')
            .setStyle(ButtonStyle.Success), new ButtonBuilder()
            .setCustomId(`roll_edit`)
            .setLabel('✏️ Editar')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(rolls.length === 0), new ButtonBuilder()
            .setCustomId(`roll_delete`)
            .setLabel('🗑️ Excluir')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(rolls.length === 0));
        // Responder ou atualizar interação
        let response;
        try {
            if (interaction.deferred) {
                response = await interaction.editReply({ embeds: [embed], components: [row] });
            }
            else if (interaction.replied) {
                response = await interaction.editReply({ embeds: [embed], components: [row] });
            }
            else {
                response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            }
        }
        catch (err) {
            logger.error('[CreateRoll] Erro ao enviar dashboard:', err);
            return;
        }
        // Criar collector para os botões (10 minutos de timeout)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });
        collector.on('collect', async (i) => {
            try {
                // Verificar se é o usuário correto
                const originalUserId = interaction.user?.id || interaction.author?.id;
                if (i.user.id !== originalUserId) {
                    return await i.reply({ content: '❌ Apenas quem usou o comando pode interagir.', flags: MessageFlags.Ephemeral });
                }
                // Processar ação do botão
                if (i.customId === 'roll_next') {
                    // Navegar para próxima página
                    collector.stop('navigation');
                    await i.deferUpdate();
                    return await this.showDashboard(i, page + 1);
                }
                if (i.customId === 'roll_prev') {
                    // Navegar para página anterior
                    collector.stop('navigation');
                    await i.deferUpdate();
                    return await this.showDashboard(i, page - 1);
                }
                if (i.customId === 'roll_create') {
                    // Criar novo roll
                    collector.stop('create');
                    return await this.handleCreateModal(i);
                }
                if (i.customId === 'roll_edit') {
                    // Editar roll atual
                    collector.stop('edit');
                    return await this.handleEditMenu(i, rolls[page]);
                }
                if (i.customId === 'roll_delete') {
                    // Excluir roll atual
                    await prisma.roll.delete({ where: { id: rolls[page].id } });
                    logger.info(`[CreateRoll] Roll ${rolls[page].id} excluído`);
                    collector.stop('delete');
                    await i.deferUpdate();
                    return await this.showDashboard(i, 0);
                }
            }
            catch (err) {
                logger.error('[CreateRoll] Erro ao processar interação:', err);
                try {
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
                    }
                }
                catch (replyErr) {
                    logger.error('[CreateRoll] Erro ao enviar mensagem de erro:', replyErr);
                }
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                logger.info('[CreateRoll] Collector expirou por timeout');
            }
        });
    },
    /**
     * Abre modal para criar novo roll
     */
    async handleCreateModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modal_create_roll')
            .setTitle('Criar Novo Roll');
        const triggerInput = new TextInputBuilder()
            .setCustomId('trigger')
            .setLabel('Gatilho (Mensagem exata)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: !roll atacar')
            .setRequired(true);
        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Título da Embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Resultado do Ataque')
            .setRequired(true);
        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Descrição (Opcional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Descrição que aparecerá na embed')
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(triggerInput), new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
        await interaction.showModal(modal);
        // Aguardar submissão do modal (60 segundos)
        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (submitted) {
            const trigger = submitted.fields.getTextInputValue('trigger');
            const title = submitted.fields.getTextInputValue('title');
            const description = submitted.fields.getTextInputValue('description') || '';
            // Criar roll no banco
            await prisma.roll.create({
                data: { trigger, title, description }
            });
            logger.info(`[CreateRoll] Novo roll criado: ${trigger}`);
            await submitted.reply({
                content: '✅ Roll criado com sucesso! Agora adicione opções clicando em **Editar**.',
                flags: MessageFlags.Ephemeral
            });
            return this.showDashboard(submitted, 0);
        }
    },
    /**
     * Menu de edição de roll
     */
    async handleEditMenu(interaction, roll) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle(`✏️ Editando: ${roll.title}`)
            .setDescription('Escolha o que deseja fazer com este roll:')
            .addFields({ name: '🎯 Gatilho', value: `\`${roll.trigger}\`` }, { name: '📝 Opções', value: `${roll.options.length} opção(ões) configurada(s)` })
            .setFooter({ text: EMBED_CREDIT });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId('edit_options')
            .setLabel('➕ Adicionar Opção')
            .setStyle(ButtonStyle.Primary), new ButtonBuilder()
            .setCustomId('edit_clear')
            .setLabel('🗑️ Limpar Opções')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(roll.options.length === 0), new ButtonBuilder()
            .setCustomId('edit_back')
            .setLabel('◀️ Voltar')
            .setStyle(ButtonStyle.Secondary));
        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true,
            flags: MessageFlags.Ephemeral
        });
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });
        collector.on('collect', async (i) => {
            try {
                if (i.customId === 'edit_back') {
                    collector.stop('back');
                    await i.deferUpdate();
                    return this.showDashboard(i, 0);
                }
                if (i.customId === 'edit_options') {
                    collector.stop('add_option');
                    return this.handleOptionsManager(i, roll);
                }
                if (i.customId === 'edit_clear') {
                    await prisma.rollOption.deleteMany({ where: { rollId: roll.id } });
                    logger.info(`[CreateRoll] Opções do roll ${roll.id} limpas`);
                    await i.reply({ content: '✅ Todas as opções foram removidas.', flags: MessageFlags.Ephemeral });
                    collector.stop('cleared');
                    return this.showDashboard(i, 0);
                }
            }
            catch (err) {
                logger.error('[CreateRoll] Erro no menu de edição:', err);
            }
        });
    },
    /**
     * Gerenciador de adição de opções
     */
    async handleOptionsManager(interaction, roll) {
        const modal = new ModalBuilder()
            .setCustomId('modal_add_option')
            .setTitle(`Adicionar Opção: ${roll.title.substring(0, 30)}`);
        const textInput = new TextInputBuilder()
            .setCustomId('text')
            .setLabel('Texto da Resposta')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Ex: Você acertou o alvo em cheio!')
            .setRequired(true);
        const weightInput = new TextInputBuilder()
            .setCustomId('weight')
            .setLabel('Peso/Chance (Número inteiro)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 10 (quanto maior, mais comum)')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(textInput), new ActionRowBuilder().addComponents(weightInput));
        await interaction.showModal(modal);
        // Aguardar submissão
        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (submitted) {
            const text = submitted.fields.getTextInputValue('text');
            const weight = parseInt(submitted.fields.getTextInputValue('weight')) || 1;
            // Validar peso
            if (weight < 1) {
                return submitted.reply({ content: '❌ O peso deve ser no mínimo 1.', flags: MessageFlags.Ephemeral });
            }
            // Adicionar opção ao banco
            await prisma.rollOption.create({
                data: { rollId: roll.id, text, weight }
            });
            logger.info(`[CreateRoll] Opção adicionada ao roll ${roll.id} (peso: ${weight})`);
            await submitted.reply({ content: '✅ Opção adicionada com sucesso!', flags: MessageFlags.Ephemeral });
            return this.showDashboard(submitted, 0);
        }
    }
};
//# sourceMappingURL=create-roll.js.map