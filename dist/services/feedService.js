import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
export class FeedService {
    static async createPost(client, userId, imageUrl, caption, guildId, channelId) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            if (!channel)
                throw new Error('Canal do Feed não encontrado.');
            const user = await client.users.fetch(userId);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(caption || null)
                .setImage(imageUrl)
                .setFooter({ text: `Postado por ${user.username} • ${EMBED_CREDIT}` })
                .setTimestamp();
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('feed_like').setLabel('❤️ 0').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('feed_repost').setLabel('🔁 0').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('feed_comment').setLabel('💬 0').setStyle(ButtonStyle.Secondary));
            const message = await channel.send({ embeds: [embed], components: [row] });
            await prisma.feedPost.create({
                data: {
                    userId,
                    imageUrl,
                    caption,
                    messageId: message.id
                }
            });
            return message;
        }
        catch (error) {
            logger.error('Erro ao criar post no feed:', error);
            throw error;
        }
    }
    static async handleInteraction(interaction) {
        const { customId, message, user } = interaction;
        const post = await prisma.feedPost.findUnique({ where: { messageId: message.id } });
        if (!post)
            return;
        let { likes, reposts } = post;
        const { comments } = post;
        if (customId === 'feed_like') {
            likes++;
            await prisma.feedPost.update({ where: { id: post.id }, data: { likes } });
            await this.updateMessage(message, likes, reposts, comments);
            await interaction.deferUpdate().catch(() => { });
        }
        else if (customId === 'feed_repost') {
            reposts++;
            await prisma.feedPost.update({ where: { id: post.id }, data: { reposts } });
            await this.updateMessage(message, likes, reposts, comments);
            await interaction.deferUpdate().catch(() => { });
        }
        else if (customId === 'feed_comment') {
            // Abrir modal para comentário
            const modal = new ModalBuilder()
                .setCustomId(`modal_feed_comment_${message.id}`)
                .setTitle('Comentar no Post');
            const commentInput = new TextInputBuilder()
                .setCustomId('comment_text')
                .setLabel("Seu comentário")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Escreva algo legal...')
                .setRequired(true)
                .setMaxLength(200);
            const firstActionRow = new ActionRowBuilder().addComponents(commentInput);
            modal.addComponents(firstActionRow);
            await interaction.showModal(modal);
        }
    }
    static async handleModal(interaction) {
        // Extrair ID da mensagem do customId: modal_feed_comment_MESSAGE_ID
        const messageId = interaction.customId.split('modal_feed_comment_')[1];
        if (!messageId)
            return;
        const post = await prisma.feedPost.findUnique({ where: { messageId } });
        if (!post) {
            return interaction.reply({ content: '❌ Post não encontrado.', flags: MessageFlags.Ephemeral });
        }
        // Incrementar comentários (simulação visual, já que não temos tabela de comentários vinculada)
        const comments = post.comments + 1;
        await prisma.feedPost.update({ where: { id: post.id }, data: { comments } });
        // Tentar atualizar a mensagem original
        try {
            const channel = interaction.channel;
            if (channel) {
                const message = await channel.messages.fetch(messageId);
                if (message) {
                    await this.updateMessage(message, post.likes, post.reposts, comments);
                }
            }
        }
        catch (err) {
            logger.error('Erro ao atualizar mensagem do feed após modal:', err);
        }
        await interaction.reply({ content: '✅ Comentário enviado! (Simulação)', flags: MessageFlags.Ephemeral });
    }
    static async updateMessage(message, likes, reposts, comments) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('feed_like').setLabel(`❤️ ${likes}`).setStyle(likes > 0 ? ButtonStyle.Danger : ButtonStyle.Secondary), new ButtonBuilder().setCustomId('feed_repost').setLabel(`🔁 ${reposts}`).setStyle(reposts > 0 ? ButtonStyle.Success : ButtonStyle.Secondary), new ButtonBuilder().setCustomId('feed_comment').setLabel(`💬 ${comments}`).setStyle(comments > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary));
        await message.edit({ components: [row] }).catch(() => { });
    }
}
//# sourceMappingURL=feedService.js.map