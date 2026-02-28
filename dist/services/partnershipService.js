import { EmbedBuilder, TextChannel, MessageFlags } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
/**
 * Serviço de Parcerias
 *
 * Funcionalidades:
 * - Detecção automática de convites do Discord
 * - Contabilização de parcerias por staff
 * - Sistema de ranking de parceiros
 * - Notificações automáticas
 * - Atribuição de cargos
 */
export class PartnershipService {
    /**
     * Detecta e processa convites de Discord em mensagens
     * Incrementa estatísticas e envia notificações
     */
    static async handleInviteDetection(message) {
        if (message.author.bot || !message.guild)
            return;
        try {
            // Buscar configuração de parcerias
            const config = await prisma.systemConfig.findUnique({ where: { key: 'partnership_config' } });
            const pConfig = config ? JSON.parse(config.value) : null;
            if (!pConfig || message.channel.id !== pConfig.partnershipChannelId)
                return;
            // Detectar convite do Discord (regex sem flag 'g' para evitar bug de estado)
            const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[^\s\/]+?(?=\b)/;
            if (!inviteRegex.test(message.content))
                return;
            logger.info(`[Partnership] Convite detectado de ${message.author.id} no canal ${message.channel.id}`);
            // 1. Incrementar estatísticas da Staff
            const stats = await prisma.staffPartnerStats.upsert({
                where: { userId: message.author.id },
                update: {
                    totalPartners: { increment: 1 },
                    lastPartnerAt: new Date()
                },
                create: {
                    userId: message.author.id,
                    totalPartners: 1,
                    lastPartnerAt: new Date()
                }
            });
            // 2. Buscar posição no ranking
            const allStats = await prisma.staffPartnerStats.findMany({
                orderBy: { totalPartners: 'desc' }
            });
            const rankPosition = allStats.findIndex((s) => s.userId === message.author.id) + 1;
            // 3. Atribuir cargo de parceiro se houver menção
            const mentionedMember = message.mentions.members?.first();
            if (mentionedMember && pConfig.partnerRoleId) {
                try {
                    await mentionedMember.roles.add(pConfig.partnerRoleId);
                    logger.info(`[Partnership] Cargo de parceiro atribuído a ${mentionedMember.id}`);
                }
                catch (err) {
                    logger.error('[Partnership] Erro ao atribuir cargo de parceiro:', err);
                }
            }
            // 4. Enviar notificação de nova parceria
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('🤝 Nova Parceria Firmada!')
                .setDescription(`Uma nova aliança foi estabelecida por ${message.author.toString()}!`)
                .addFields({ name: '👤 Staff Responsável', value: message.author.username, inline: true }, { name: '📈 Total de Parcerias', value: `\`${stats.totalPartners}\``, inline: true }, { name: '🏆 Posição no Ranking', value: `\`#${rankPosition}\``, inline: true })
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            // Enviar com ping se configurado
            const pingContent = pConfig.pingRoleId ? `<@&${pConfig.pingRoleId}>` : '';
            if (message.channel instanceof TextChannel) {
                await message.channel.send({ content: pingContent, embeds: [embed] });
            }
            logger.info(`[Partnership] Notificação enviada - ${message.author.id} agora tem ${stats.totalPartners} parcerias`);
        }
        catch (error) {
            logger.error('[Partnership] Erro ao processar detecção de parceria:', error);
        }
    }
    /**
     * Retorna o ranking de parcerias (top 10)
     */
    static async getRanking() {
        try {
            return await prisma.staffPartnerStats.findMany({
                orderBy: { totalPartners: 'desc' },
                take: 10
            });
        }
        catch (error) {
            logger.error('[Partnership] Erro ao buscar ranking:', error);
            return [];
        }
    }
    /**
     * Processa análise de pedidos de parceria (aprovação/rejeição)
     */
    static async handleAnalysis(interaction) {
        try {
            const { customId, message, user } = interaction;
            const parts = customId.split('_');
            const action = parts[1]; // approve ou reject
            const requesterId = parts[2];
            // Buscar configuração
            const config = await prisma.systemConfig.findUnique({ where: { key: 'partnership_config' } });
            const pConfig = config ? JSON.parse(config.value) : null;
            if (action === 'approve') {
                // Aprovar parceria
                if (!pConfig?.partnershipChannelId) {
                    return interaction.reply({ content: '❌ Canal de parcerias não configurado.', flags: MessageFlags.Ephemeral });
                }
                const partnershipChannel = await interaction.client.channels.fetch(pConfig.partnershipChannelId);
                const originalEmbed = message.embeds[0];
                // Extrair informações do embed original
                const serverField = originalEmbed.fields.find((f) => f.name === '🏰 Servidor');
                const descField = originalEmbed.fields.find((f) => f.name === '📝 Descrição');
                const inviteField = originalEmbed.fields.find((f) => f.name === '🔗 Convite');
                if (!serverField || !inviteField) {
                    return interaction.reply({ content: '❌ Embed inválido.', flags: MessageFlags.Ephemeral });
                }
                // Postar no canal de parcerias
                const serverName = serverField.value.split('**')[1] || 'Servidor Parceiro';
                const postEmbed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.PRIMARY)
                    .setTitle(`🤝 Parceria: ${serverName}`)
                    .setDescription(descField?.value || 'Sem descrição')
                    .addFields({ name: '🔗 Entre agora!', value: inviteField.value })
                    .setThumbnail(originalEmbed.thumbnail?.url || null)
                    .setFooter({ text: EMBED_CREDIT })
                    .setTimestamp();
                await partnershipChannel.send({ embeds: [postEmbed] });
                logger.info(`[Partnership] Parceria aprovada e postada no canal ${pConfig.partnershipChannelId}`);
                // Atualizar mensagem de análise
                const approvedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(EMBED_COLORS.SUCCESS)
                    .addFields({ name: '✅ Status', value: `Aprovado por ${user.toString()}` });
                await interaction.update({ embeds: [approvedEmbed], components: [] });
                // Notificar usuário
                try {
                    const requester = await interaction.client.users.fetch(requesterId);
                    if (requester) {
                        await requester.send(`✅ Seu pedido de parceria com o servidor **${interaction.guild.name}** foi aprovado!`);
                    }
                }
                catch (err) {
                    logger.error('[Partnership] Erro ao notificar usuário:', err);
                }
            }
            else if (action === 'reject') {
                // Rejeitar parceria
                const rejectedEmbed = EmbedBuilder.from(message.embeds[0])
                    .setColor(EMBED_COLORS.DANGER)
                    .addFields({ name: '❌ Status', value: `Rejeitado por ${user.toString()}` });
                await interaction.update({ embeds: [rejectedEmbed], components: [] });
                logger.info(`[Partnership] Parceria rejeitada por ${user.id}`);
                // Notificar usuário
                try {
                    const requester = await interaction.client.users.fetch(requesterId);
                    if (requester) {
                        await requester.send(`❌ Seu pedido de parceria com o servidor **${interaction.guild.name}** foi rejeitado pela staff.`);
                    }
                }
                catch (err) {
                    logger.error('[Partnership] Erro ao notificar usuário:', err);
                }
            }
        }
        catch (error) {
            logger.error('[Partnership] Erro ao processar análise:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Ocorreu um erro ao processar a análise.', flags: MessageFlags.Ephemeral });
                }
            }
            catch (replyErr) {
                logger.error('[Partnership] Erro ao enviar mensagem de erro:', replyErr);
            }
        }
    }
}
//# sourceMappingURL=partnershipService.js.map