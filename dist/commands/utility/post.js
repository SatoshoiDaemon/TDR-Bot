import { SlashCommandBuilder, Message, MessageFlags } from 'discord.js';
import { FeedService } from '../../services/feedService.js';
import { appConfig } from '../../shared/config.js';
import { prisma } from '../../database/client.js';
import { logger } from '../../shared/logger.js';
export const postCommand = {
    name: 'post',
    description: 'Posta uma foto no Feed Imperial (Apenas para membros verificados)',
    data: new SlashCommandBuilder()
        .setName('post')
        .setDescription('Posta uma foto no Feed Imperial')
        .addAttachmentOption(o => o.setName('imagem').setDescription('A imagem que deseja postar').setRequired(true))
        .addStringOption(o => o.setName('legenda').setDescription('Legenda da sua foto').setRequired(false)),
    async execute(interactionOrMessage, client) {
        const member = interactionOrMessage.member;
        const userId = member.id;
        // Verificar se o usuário tem o cargo de verificado
        const config = await prisma.systemConfig.findUnique({ where: { key: 'feed_config' } });
        const feedConfig = config ? JSON.parse(config.value) : null;
        const verifiedRoleId = feedConfig?.verifiedRoleId;
        if (verifiedRoleId && !member.roles.cache.has(verifiedRoleId)) {
            const msg = '❌ Apenas membros com o cargo de **Verificado** podem postar no Feed.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        let imageUrl = null;
        let caption = '';
        if (interactionOrMessage instanceof Message) {
            imageUrl = interactionOrMessage.attachments.first()?.url || null;
            caption = interactionOrMessage.content.split(' ').slice(1).join(' ');
        }
        else {
            const attachment = interactionOrMessage.options.getAttachment('imagem', true);
            imageUrl = attachment.url;
            caption = interactionOrMessage.options.getString('legenda') || '';
        }
        if (!imageUrl) {
            const msg = '❌ Você precisa anexar uma imagem para postar no Feed.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        try {
            const channelId = feedConfig?.channelId || appConfig.discord.feedChannel;
            if (!channelId) {
                const msg = '❌ O sistema de Feed não está configurado neste servidor.';
                if (interactionOrMessage instanceof Message)
                    return interactionOrMessage.reply(msg);
                return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            await FeedService.createPost(client, userId, imageUrl, caption, interactionOrMessage.guildId, channelId);
            const successMsg = '✅ Sua foto foi postada no Feed Imperial!';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(successMsg);
            return interactionOrMessage.reply({ content: successMsg, flags: MessageFlags.Ephemeral });
        }
        catch (error) {
            logger.error('Erro ao processar comando de postagem no feed:', error);
            const errorMsg = '❌ Ocorreu um erro ao postar sua foto.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(errorMsg);
            return interactionOrMessage.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=post.js.map