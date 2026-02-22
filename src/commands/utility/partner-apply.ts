import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder,
  TextChannel
,
    MessageFlags
} from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export const partnerApplyCommand = {
  name: 'partner-apply',
  description: 'Envia um pedido de parceria para o servidor',
  data: new SlashCommandBuilder()
    .setName('partner-apply')
    .setDescription('Envia um pedido de parceria para o servidor'),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_partner_apply')
      .setTitle('Pedido de Parceria');

    const inviteInput = new TextInputBuilder()
      .setCustomId('invite')
      .setLabel('Link do Servidor (Convite)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('https://discord.gg/exemplo');

    const descInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Descrição do Servidor')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Conte um pouco sobre o seu servidor...');

    const botInviteInput = new TextInputBuilder()
      .setCustomId('bot_invite')
      .setLabel('Convite para o Bot (Opcional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('Link para adicionar o bot de parceria');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inviteInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(botInviteInput)
    );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({ time: 300000 }).catch(() => null);
    if (submitted) {
      const invite = submitted.fields.getTextInputValue('invite');
      const description = submitted.fields.getTextInputValue('description');
      const botInvite = submitted.fields.getTextInputValue('bot_invite');

      // 1. Filtros de Segurança (everyone/here)
      if (description.includes('@everyone') || description.includes('@here')) {
        return submitted.reply({ content: '❌ Menções de `@everyone` ou `@here` não são permitidas na descrição.', flags: MessageFlags.Ephemeral });
      }

      try {
        // 2. Validar Convite e Filtros de Servidor
        const inviteData = await interaction.client.fetchInvite(invite).catch(() => null);
        if (!inviteData) {
          return submitted.reply({ content: '❌ Link de convite inválido ou expirado.', flags: MessageFlags.Ephemeral });
        }

        const config = await prisma.systemConfig.findUnique({ where: { key: 'partnership_config' } });
        const pConfig = config ? JSON.parse(config.value) : null;

        if (pConfig) {
          // Filtro de Membros Mínimos
          if (pConfig.minMembers && inviteData.memberCount && inviteData.memberCount < pConfig.minMembers) {
            return submitted.reply({ content: `❌ Seu servidor precisa de pelo menos **${pConfig.minMembers}** membros para solicitar parceria.`, flags: MessageFlags.Ephemeral });
          }

          // Filtro de Blacklist (ID ou Nome)
          if (pConfig.blacklist?.includes(inviteData.guild?.id) || pConfig.blacklist?.includes(inviteData.guild?.name)) {
            return submitted.reply({ content: '❌ Este servidor está na lista negra de parcerias.', flags: MessageFlags.Ephemeral });
          }

          // Filtro de Renovação (Tempo Mínimo)
          const lastPartnership = await prisma.partnership.findFirst({
            where: { guildId: inviteData.guild?.id, status: 'approved' },
            orderBy: { createdAt: 'desc' }
          });

          if (lastPartnership && pConfig.cooldownDays) {
            const cooldownMs = pConfig.cooldownDays * 24 * 60 * 60 * 1000;
            if (Date.now() - lastPartnership.createdAt.getTime() < cooldownMs) {
              return submitted.reply({ content: `❌ Este servidor já realizou uma parceria recentemente. Aguarde o tempo de renovação.`, flags: MessageFlags.Ephemeral });
            }
          }
        }

        // 3. Enviar para Análise da Staff
        const analysisChannelId = pConfig?.analysisChannelId;
        if (!analysisChannelId) {
          return submitted.reply({ content: '❌ O sistema de parcerias não está totalmente configurado (canal de análise ausente).', flags: MessageFlags.Ephemeral });
        }

        const analysisChannel = await interaction.client.channels.fetch(analysisChannelId) as TextChannel;
        
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.WARNING)
          .setTitle('📝 Novo Pedido de Parceria')
          .setThumbnail(inviteData.guild?.iconURL() || null)
          .addFields(
            { name: '🏰 Servidor', value: `**${inviteData.guild?.name}** (\`${inviteData.guild?.id}\`)`, inline: false },
            { name: '👥 Membros', value: `\`${inviteData.memberCount || '?'}\``, inline: true },
            { name: '👤 Solicitante', value: `${submitted.user.tag} (\`${submitted.user.id}\`)`, inline: true },
            { name: '🔗 Convite', value: invite, inline: false },
            { name: '📝 Descrição', value: description.substring(0, 1024) }
          )
          .setFooter({ text: `ID do Pedido: Pendente • ${EMBED_CREDIT}` })
          .setTimestamp();

        if (botInvite) embed.addFields({ name: '🤖 Convite do Bot', value: botInvite });

        const row = new ActionRowBuilder<any>().addComponents(
          { type: 2, style: 3, label: 'Aprovar', custom_id: `partner_approve_${submitted.user.id}` },
          { type: 2, style: 4, label: 'Rejeitar', custom_id: `partner_reject_${submitted.user.id}` }
        );

        const analysisMsg = await analysisChannel.send({ embeds: [embed], components: [row] });

        // 4. Salvar no Banco
        await prisma.partnership.create({
          data: {
            guildId: inviteData.guild?.id || 'unknown',
            guildName: inviteData.guild?.name,
            inviteUrl: invite,
            description,
            requesterId: submitted.user.id,
            status: 'pending'
          }
        });

        await submitted.reply({ content: '✅ Seu pedido de parceria foi enviado para análise da nossa staff!', flags: MessageFlags.Ephemeral });

      } catch (error) {
        logger.error('Erro ao processar pedido de parceria:', error);
        await submitted.reply({ content: '❌ Ocorreu um erro ao processar seu pedido.', flags: MessageFlags.Ephemeral });
      }
    }
  }
};
