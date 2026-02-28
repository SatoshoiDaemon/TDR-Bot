import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
export class StarBoardService {
    static async featureRandomProfile(client, guildId, channelId) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            if (!channel)
                return;
            // Buscar um usuário aleatório que tenha perfil e não tenha sido destacado recentemente
            const users = await prisma.user.findMany({
                take: 50,
                orderBy: { updatedAt: 'desc' },
                include: { level: true }
            });
            if (users.length === 0)
                return;
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const member = await guild.members.fetch(randomUser.id).catch(() => null);
            if (!member)
                return;
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle(`🌟 Destaque do Momento: ${member.user.username}`)
                .setDescription(randomUser.aboutMe || 'Um cidadão de TDR.')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields({ name: '⭐ Nível', value: `\`${randomUser.level?.level || 0}\``, inline: true }, { name: '📅 No Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true })
                .setFooter({ text: `Clique na estrela para apoiar este membro! • ${EMBED_CREDIT}` })
                .setTimestamp();
            if (member.user.bannerURL()) {
                embed.setImage(member.user.bannerURL({ size: 1024 }));
            }
            else if (randomUser.profileImage) {
                embed.setImage(randomUser.profileImage);
            }
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId(`star_${member.id}`)
                .setLabel('⭐ 0')
                .setStyle(ButtonStyle.Secondary));
            const message = await channel.send({ content: '✨ **Um novo membro foi destacado!**', embeds: [embed], components: [row] });
            // Atualizar no banco que foi destacado
            await prisma.userProfile.upsert({
                where: { id: member.id },
                update: { lastFeaturedAt: new Date() },
                create: { id: member.id, lastFeaturedAt: new Date() }
            });
            // Coletor para as estrelas
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 3600000 // 1 hora de destaque ativo para votos
            });
            const voters = new Set();
            collector.on('collect', async (i) => {
                if (voters.has(i.user.id)) {
                    return await i.reply({ content: 'Você já deu sua estrela para este perfil!', flags: MessageFlags.Ephemeral });
                }
                if (i.user.id === member.id) {
                    return await i.reply({ content: 'Você não pode dar uma estrela para si mesmo!', flags: MessageFlags.Ephemeral });
                }
                voters.add(i.user.id);
                // Incrementar estrelas no banco
                await prisma.userProfile.update({
                    where: { id: member.id },
                    data: { stars: { increment: 1 } }
                });
                const newCount = voters.size;
                const updatedRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                    .setCustomId(`star_${member.id}`)
                    .setLabel(`⭐ ${newCount}`)
                    .setStyle(ButtonStyle.Success));
                await i.update({ components: [updatedRow] });
            });
        }
        catch (error) {
            logger.error('Erro ao destacar perfil no StarBoard:', error);
        }
    }
}
//# sourceMappingURL=starBoardService.js.map