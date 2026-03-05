import {
  Client, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
  MessageFlags, ButtonInteraction
} from 'discord.js';
import { prisma } from '@database/client.js';
import { redis } from '@database/redis.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export class StarBoardService {
  static async featureRandomProfile(client: Client, guildId: string, channelId: string) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      if (!channel) return;

      // Buscar um usuário aleatório que tenha perfil e não tenha sido destacado recentemente
      const users = await prisma.user.findMany({
        take: 50,
        orderBy: { updatedAt: 'desc' },
        include: { level: true }
      });

      if (users.length === 0) return;

      let member = null;
      let randomUser = null;

      // Misturar usuários para aleatoriedade
      const shuffledUsers = users.sort(() => 0.5 - Math.random());

      for (const u of shuffledUsers) {
        const m = await guild.members.fetch(u.id).catch(() => null);
        if (m) {
          await m.user.fetch().catch(() => null); // Force fetch banner/avatar info fully

          // Filtro anti avatar/banner vazio: Se tiver custom avatar, banner ou uma imagem de perfil configurada
          if (m.user.avatar || m.user.banner || u.profileImage) {
            member = m;
            randomUser = u;
            break;
          }
        }
      }

      if (!member || !randomUser) return;

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle(`🌟 Destaque do Momento: ${member.user.username}`)
        .setDescription(randomUser.aboutMe || 'Um cidadão de TDR.')
        .setImage(member.user.displayAvatarURL({ size: 1024 }))
        .addFields(
          { name: '⭐ Nível', value: `\`${randomUser.level?.level || 0}\``, inline: true },
          { name: '📅 No Servidor', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `Clique na estrela para apoiar este membro! • ${EMBED_CREDIT}` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`star_${member.id}`)
          .setLabel('⭐ 0')
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await channel.send({ content: '✨ **Um novo membro foi destacado!**', embeds: [embed], components: [row] });

      const bannerUrl = member.user.bannerURL({ size: 1024 }) || randomUser.profileImage;
      if (bannerUrl) {
        const bannerEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.PRIMARY)
          .setImage(bannerUrl)
          .setFooter({ text: `🖼️ Banner de ${member.user.username} • ${EMBED_CREDIT}` });

        await channel.send({ embeds: [bannerEmbed] });
      }

      // Atualizar no banco que foi destacado
      await prisma.userProfile.upsert({
        where: { id: member.id },
        update: { lastFeaturedAt: new Date() },
        create: { id: member.id, lastFeaturedAt: new Date() }
      });

    } catch (error) {
      logger.error('Erro ao destacar perfil no StarBoard:', error);
    }
  }

  static async handleStarInteraction(interaction: ButtonInteraction) {
    try {
      const targetUserId = interaction.customId.replace('star_', '');
      const voterId = interaction.user.id;

      if (voterId === targetUserId) {
        return await interaction.reply({ content: 'Você não pode dar uma estrela para si mesmo!', flags: MessageFlags.Ephemeral });
      }

      const messageId = interaction.message.id;
      const redisKey = `star_votes:${messageId}`;

      const alreadyVoted = await redis.sismember(redisKey, voterId);
      if (alreadyVoted) {
        return await interaction.reply({ content: 'Você já deu sua estrela para este perfil!', flags: MessageFlags.Ephemeral });
      }

      await redis.sadd(redisKey, voterId);
      await redis.expire(redisKey, 86400 * 7); // Guarda o voto por 7 dias na memória do redis

      // Incrementar estrelas no banco
      await prisma.userProfile.update({
        where: { id: targetUserId },
        data: { stars: { increment: 1 } }
      });

      // Atualizar o botão com o novo count
      const row = interaction.message.components[0] as any;
      const currentBtn = row.components[0];
      const currentCount = parseInt(currentBtn.label?.replace('⭐ ', '') || '0') + 1;

      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`star_${targetUserId}`)
          .setLabel(`⭐ ${currentCount}`)
          .setStyle(ButtonStyle.Success)
      );

      await interaction.update({ components: [updatedRow] });
    } catch (error) {
      logger.error('Erro ao processar estrela:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua estrela.', flags: MessageFlags.Ephemeral });
      }
    }
  }
}
