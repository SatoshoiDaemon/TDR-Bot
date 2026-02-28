import { Client, EmbedBuilder, TextChannel, Message, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

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
  private static cachedConfig: any = null;
  private static configCacheTime: number = 0;

  private static async getConfig() {
    if (this.cachedConfig && Date.now() - this.configCacheTime < 60000) {
      return this.cachedConfig;
    }
    const config = await prisma.systemConfig.findUnique({ where: { key: 'partnership_config' } });
    this.cachedConfig = config ? JSON.parse(config.value) : null;
    this.configCacheTime = Date.now();
    return this.cachedConfig;
  }

  /**
   * Detecta e processa convites de Discord em mensagens
   * Incrementa estatísticas e envia notificações
   */
  static async handleInviteDetection(message: Message) {
    if (message.author.bot || !message.guild) return;

    try {
      if (!message.content.includes('discord.gg/') && !message.content.includes('discord.com/invite/')) return;

      const pConfig = await this.getConfig();

      if (!pConfig || message.channel.id !== pConfig.partnershipChannelId) return;

      // Detectar convite do Discord (regex sem flag 'g' para evitar bug de estado)
      const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[^\s\/]+?(?=\b)/;
      if (!inviteRegex.test(message.content)) return;

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
      const rankPosition = allStats.findIndex((s: any) => s.userId === message.author.id) + 1;

      // 3. Atribuir cargo de parceiro se houver menção
      const mentionedMember = message.mentions.members?.first();
      if (mentionedMember && pConfig.partnerRoleId) {
        try {
          await mentionedMember.roles.add(pConfig.partnerRoleId);
          logger.info(`[Partnership] Cargo de parceiro atribuído a ${mentionedMember.id}`);

          // Enviar DM de agradecimento ao parceiro
          try {
            await mentionedMember.send(
              `🤝 **Obrigado pela parceria com o ${message.guild!.name}!**\n\n` +
              `Agradecemos por fazer parte da nossa rede de parcerias. Sua presença é muito importante para nós!\n\n` +
              `⚠️ **Atenção:** Caso você saia do servidor, a parceria será automaticamente desfeita.`
            );
            logger.info(`[Partnership] DM de agradecimento enviada para ${mentionedMember.id}`);
          } catch (dmErr) {
            logger.warn(`[Partnership] Não foi possível enviar DM para ${mentionedMember.id} (DMs fechadas).`);
          }
        } catch (err) {
          logger.error('[Partnership] Erro ao atribuir cargo de parceiro:', err);
        }
      }

      // 4. Enviar notificação de nova parceria
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.SUCCESS)
        .setTitle('🤝 Nova Parceria Firmada!')
        .setDescription(`Uma nova aliança foi estabelecida por ${message.author.toString()}!`)
        .addFields(
          { name: '👤 Staff Responsável', value: message.author.username, inline: true },
          { name: '📈 Total de Parcerias', value: `\`${stats.totalPartners}\``, inline: true },
          { name: '🏆 Posição no Ranking', value: `\`#${rankPosition}\``, inline: true }
        )
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      // Enviar com ping se configurado
      const pingContent = pConfig.pingRoleId ? `<@&${pConfig.pingRoleId}>` : '';
      if (message.channel instanceof TextChannel) {
        await message.channel.send({ content: pingContent, embeds: [embed] });
      }

      logger.info(`[Partnership] Notificação enviada - ${message.author.id} agora tem ${stats.totalPartners} parcerias`);

    } catch (error) {
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
    } catch (error) {
      logger.error('[Partnership] Erro ao buscar ranking:', error);
      return [];
    }
  }

  /**
   * Processa análise de pedidos de parceria (aprovação/rejeição)
   */
  static async handleAnalysis(interaction: any) {
    try {
      const { customId, message, user } = interaction;
      const parts = customId.split('_');
      const action = parts[1]; // apply, approve ou reject

      if (action === 'apply') {
        const modal = new ModalBuilder()
          .setCustomId('modal_partner_apply')
          .setTitle('Pedido de Parceria');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('invite').setLabel('Link do Servidor (Convite)')
              .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://discord.gg/exemplo')
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('message').setLabel('Mensagem de Parceria')
              .setStyle(TextInputStyle.Paragraph).setRequired(true)
              .setPlaceholder('Cole aqui sua mensagem completa de parceria (descrição, links, etc.)')
              .setMaxLength(4000)
          )
        );

        return await interaction.showModal(modal);
      }

      const requesterId = parts[2];

      const pConfig = await this.getConfig();

      if (action === 'approve') {
        // Aprovar parceria
        if (!pConfig?.partnershipChannelId) {
          return interaction.reply({ content: '❌ Canal de parcerias não configurado.', flags: MessageFlags.Ephemeral });
        }

        const partnershipChannel = await interaction.client.channels.fetch(pConfig.partnershipChannelId) as TextChannel;
        const originalEmbed = message.embeds[0];

        // Extrair informações do embed original
        const serverField = originalEmbed.fields.find((f: any) => f.name === '🏰 Servidor');
        const msgField = originalEmbed.fields.find((f: any) => f.name === '📝 Mensagem');
        const inviteField = originalEmbed.fields.find((f: any) => f.name === '🔗 Convite');

        if (!serverField || !inviteField) {
          return interaction.reply({ content: '❌ Embed inválido.', flags: MessageFlags.Ephemeral });
        }

        // Postar no canal de parcerias
        const serverName = serverField.value.split('**')[1] || 'Servidor Parceiro';
        const postEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.PRIMARY)
          .setTitle(`🤝 Parceria: ${serverName}`)
          .setDescription(msgField?.value || 'Sem descrição')
          .addFields({ name: '🔗 Entre agora!', value: inviteField.value })
          .setThumbnail(originalEmbed.thumbnail?.url || null)
          .setFooter({ text: EMBED_CREDIT })
          .setTimestamp();

        // Imagem configurada pelo admin no /setup-partnership
        if (pConfig.imageUrl) {
          postEmbed.setImage(pConfig.imageUrl);
        }

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
        } catch (err) {
          logger.error('[Partnership] Erro ao notificar usuário:', err);
        }

      } else if (action === 'reject') {
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
        } catch (err) {
          logger.error('[Partnership] Erro ao notificar usuário:', err);
        }
      }
    } catch (error) {
      logger.error('[Partnership] Erro ao processar análise:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar a análise.', flags: MessageFlags.Ephemeral });
        }
      } catch (replyErr) {
        logger.error('[Partnership] Erro ao enviar mensagem de erro:', replyErr);
      }
    }
  }

  static async handleModalSubmit(interaction: any) {
    try {
      const invite = interaction.fields.getTextInputValue('invite');
      const partnerMessage = interaction.fields.getTextInputValue('message');

      if (partnerMessage.includes('@everyone') || partnerMessage.includes('@here')) {
        return interaction.reply({ content: '❌ Menções de `@everyone` ou `@here` não são permitidas.', flags: MessageFlags.Ephemeral });
      }

      const inviteData = await interaction.client.fetchInvite(invite).catch(() => null);
      if (!inviteData) {
        return interaction.reply({ content: '❌ Link de convite inválido ou expirado.', flags: MessageFlags.Ephemeral });
      }

      const pConfig = await this.getConfig();

      if (pConfig) {
        if (pConfig.minMembers && inviteData.memberCount && inviteData.memberCount < pConfig.minMembers) {
          return interaction.reply({ content: `❌ Seu servidor precisa de pelo menos **${pConfig.minMembers}** membros.`, flags: MessageFlags.Ephemeral });
        }
        if (pConfig.blacklist?.includes(inviteData.guild?.id) || pConfig.blacklist?.includes(inviteData.guild?.name)) {
          return interaction.reply({ content: '❌ Este servidor está na lista negra.', flags: MessageFlags.Ephemeral });
        }
        const lastPartnership = await prisma.partnership.findFirst({
          where: { guildId: inviteData.guild?.id, status: 'approved' },
          orderBy: { createdAt: 'desc' }
        });
        if (lastPartnership && pConfig.cooldownDays) {
          const cooldownMs = pConfig.cooldownDays * 24 * 60 * 60 * 1000;
          if (Date.now() - lastPartnership.createdAt.getTime() < cooldownMs) {
            return interaction.reply({ content: `❌ Tempo de renovação não concluído.`, flags: MessageFlags.Ephemeral });
          }
        }
      }

      if (!pConfig?.analysisChannelId) {
        return interaction.reply({ content: '❌ O canal de análise não está configurado.', flags: MessageFlags.Ephemeral });
      }

      const analysisChannel = await interaction.client.channels.fetch(pConfig.analysisChannelId) as TextChannel;

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.WARNING)
        .setTitle('📝 Novo Pedido de Parceria')
        .setThumbnail(inviteData.guild?.iconURL() || null)
        .addFields(
          { name: '🏰 Servidor', value: `**${inviteData.guild?.name}** (\`${inviteData.guild?.id}\`)`, inline: false },
          { name: '👥 Membros', value: `\`${inviteData.memberCount || '?'}\``, inline: true },
          { name: '👤 Solicitante', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: '🔗 Convite', value: invite, inline: false },
          { name: '📝 Mensagem', value: partnerMessage.substring(0, 1024) }
        )
        .setFooter({ text: `ID do Pedido: Pendente • ${EMBED_CREDIT}` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`partner_approve_${interaction.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`partner_reject_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
      );

      await analysisChannel.send({ embeds: [embed], components: [row] });

      await prisma.partnership.create({
        data: {
          guildId: inviteData.guild?.id || 'unknown',
          guildName: inviteData.guild?.name,
          inviteUrl: invite,
          description: partnerMessage,
          requesterId: interaction.user.id,
          status: 'pending'
        }
      });

      await interaction.reply({ content: '✅ Seu pedido foi enviado para análise!', flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error('Erro ao processar envio de modal:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar o modal.', flags: MessageFlags.Ephemeral });
        }
      } catch (replyErr) {
        logger.error('[Partnership] Erro ao enviar mensagem de erro de modal:', replyErr);
      }
    }
  }
}
