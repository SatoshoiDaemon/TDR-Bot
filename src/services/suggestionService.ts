import { Client, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient, ThreadAutoArchiveDuration } from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export class SuggestionService {
  static async createSuggestion(client: Client, userId: string, content: string, guildId: string, channelId: string, webhookUrl?: string) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      if (!channel) throw new Error('Canal de sugestões não encontrado.');

      const user = await client.users.fetch(userId);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setAuthor({ name: `Sugestão de ${user.username}`, iconURL: user.displayAvatarURL() })
        .setDescription(content)
        .addFields(
          { name: '📊 Status', value: '`Pendente`', inline: true },
          { name: '👍 Votos', value: '`0`', inline: true },
          { name: '👎 Votos', value: '`0`', inline: true }
        )
        .setFooter({ text: `ID do Autor: ${userId} • ${EMBED_CREDIT}` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('suggest_up').setLabel('Aprovar').setStyle(ButtonStyle.Success).setEmoji('👍'),
        new ButtonBuilder().setCustomId('suggest_neutral').setLabel('Neutro').setStyle(ButtonStyle.Secondary).setEmoji('😐'),
        new ButtonBuilder().setCustomId('suggest_down').setLabel('Rejeitar').setStyle(ButtonStyle.Danger).setEmoji('👎')
      );

      let message;
      if (webhookUrl) {
        const webhook = new WebhookClient({ url: webhookUrl });
        message = await webhook.send({
          username: 'Central de Sugestões',
          avatarURL: client.user?.displayAvatarURL(),
          embeds: [embed],
          components: [row]
        });
      } else {
        message = await channel.send({ embeds: [embed], components: [row] });
      }

      // Criar tópico automático para discussão
      const thread = await channel.threads.create({
        name: `Discussão: Sugestão de ${user.username}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        reason: 'Tópico automático para discussão de sugestão',
        startMessage: message.id
      });

      // Salvar no banco
      await prisma.suggestion.create({
        data: {
          userId,
          content,
          messageId: message.id,
          threadId: thread.id
        }
      });

      return { messageId: message.id, threadId: thread.id };
    } catch (error) {
      logger.error('Erro ao criar sugestão:', error);
      throw error;
    }
  }

  static async handleVote(interaction: any) {
    const { customId, message, user } = interaction;
    const suggestion = await prisma.suggestion.findUnique({ where: { messageId: message.id } });
    if (!suggestion) return;

    // Lógica simplificada de votos (idealmente usaríamos uma tabela de votos para evitar duplicatas)
    // Para este MVP, vamos apenas atualizar os contadores no embed
    const embed = EmbedBuilder.from(message.embeds[0]);
    let upvotes = suggestion.upvotes;
    let downvotes = suggestion.downvotes;

    if (customId === 'suggest_up') upvotes++;
    if (customId === 'suggest_down') downvotes++;

    await prisma.suggestion.update({
      where: { messageId: message.id },
      data: { upvotes, downvotes }
    });

    embed.setFields(
      { name: '📊 Status', value: `\`${suggestion.status === 'pending' ? 'Pendente' : suggestion.status}\``, inline: true },
      { name: '👍 Votos', value: `\`${upvotes}\``, inline: true },
      { name: '👎 Votos', value: `\`${downvotes}\``, inline: true }
    );

    await interaction.update({ embeds: [embed] });
  }
}
