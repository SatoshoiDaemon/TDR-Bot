import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { EMBED_COLORS } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const afkCommand = {
    name: 'afk',
    description: 'Define seu status como AFK',
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Define seu status como AFK')
        .addStringOption(o => o.setName('motivo').setDescription('O motivo do AFK')),
    async execute(interactionOrMessage, client, db, args) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const username = interactionOrMessage instanceof Message ? interactionOrMessage.author.username : interactionOrMessage.user.username;
        const reason = (interactionOrMessage instanceof Message ? args?.join(' ') : interactionOrMessage.options.getString('motivo')) || 'Não informado';
        try {
            await prisma.user.upsert({
                where: { id: userId },
                update: {
                    afkReason: reason,
                    afkSince: new Date()
                },
                create: {
                    id: userId,
                    username: username,
                    afkReason: reason,
                    afkSince: new Date()
                }
            });
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING)
                .setTitle('💤 Status AFK Definido')
                .setDescription(`Você agora está AFK.\n**Motivo:** ${reason}`)
                .setFooter({ text: 'Seu status será removido na próxima mensagem que você enviar.' })
                .setTimestamp();
            if (interactionOrMessage instanceof Message) {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
            else {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error('Erro ao definir AFK:', error);
            const msg = '❌ Erro ao definir status AFK.';
            if (interactionOrMessage instanceof Message)
                await interactionOrMessage.reply(msg);
            else
                await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=afk.js.map