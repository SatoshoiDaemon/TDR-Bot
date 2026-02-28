import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { EMBED_COLORS } from '../../shared/embedTheme.js';
async function replyOrSend(interactionOrMessage, content) {
    if (interactionOrMessage instanceof Message) {
        const channel = interactionOrMessage.channel;
        if (channel.isTextBased() && 'send' in channel) {
            await channel.send(typeof content === 'string' ? { content } : content);
        }
    }
    else {
        if (interactionOrMessage.deferred || interactionOrMessage.replied) {
            await interactionOrMessage.editReply(typeof content === 'string' ? { content } : content);
        }
        else {
            await interactionOrMessage.reply(typeof content === 'string' ? { content } : content);
        }
    }
}
export const bannerCommand = {
    name: 'banner',
    description: 'Exibe o banner de um usuário',
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Exibe o banner de um usuário')
        .addUserOption(option => option
        .setName('usuário')
        .setDescription('Usuário para exibir o banner')
        .setRequired(false)),
    async execute(interactionOrMessage, client, database, args) {
        let targetUser = null;
        if (interactionOrMessage instanceof Message) {
            // Comando de prefixo
            if (args && args.length > 0) {
                const mention = args[0];
                const userId = mention.replace(/[<@!>]/g, '');
                try {
                    targetUser = await client.users.fetch(userId);
                }
                catch {
                    targetUser = null;
                }
            }
            if (!targetUser) {
                targetUser = interactionOrMessage.author;
            }
        }
        else {
            // Slash command
            targetUser = interactionOrMessage.options.getUser('usuário') || interactionOrMessage.user;
        }
        try {
            const fullUser = await client.users.fetch(targetUser.id, { force: true });
            const bannerURL = fullUser.bannerURL({ size: 4096, extension: 'png' });
            if (!bannerURL) {
                await replyOrSend(interactionOrMessage, {
                    content: 'Este usuário não possui banner.'
                });
                return;
            }
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle(`Banner — ${fullUser.username}`)
                .setImage(bannerURL)
                .setTimestamp();
            await replyOrSend(interactionOrMessage, { embeds: [embed] });
        }
        catch (error) {
            await replyOrSend(interactionOrMessage, {
                content: 'Não foi possível obter o banner.'
            });
        }
    }
};
//# sourceMappingURL=banner.js.map