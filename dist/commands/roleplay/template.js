import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
import axios from 'axios';
export function createRoleplayCommand(config) {
    return {
        name: config.name,
        description: config.description,
        data: new SlashCommandBuilder()
            .setName(config.name)
            .setDescription(config.description)
            .addUserOption(o => o.setName('user').setDescription('Usuário para interagir')),
        async execute(interactionOrMessage, client, db, args) {
            const author = interactionOrMessage instanceof Message ? interactionOrMessage.author : interactionOrMessage.user;
            let target = null;
            if (interactionOrMessage instanceof Message) {
                target = interactionOrMessage.mentions.members?.first() || null;
            }
            else {
                target = interactionOrMessage.options.getMember('user');
            }
            try {
                const response = await axios.get(`https://api.waifu.pics/${config.apiEndpoint}`);
                const imageUrl = response.data.url;
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.SECONDARY)
                    .setFooter({ text: EMBED_CREDIT })
                    .setTimestamp()
                    .setImage(imageUrl);
                let description = '';
                if (target) {
                    if (target.id === author.id) {
                        description = config.soloText
                            ? config.soloText.replace(/{user}/g, author.toString())
                            : `${author.toString()} está interagindo consigo mesmo... estranho.`;
                    }
                    else {
                        description = config.actionText
                            .replace(/{user}/g, author.toString())
                            .replace(/{target}/g, target.toString());
                    }
                }
                else {
                    description = config.soloText
                        ? config.soloText.replace(/{user}/g, author.toString())
                        : `${author.toString()} está procurando alguém para ${config.name}...`;
                }
                embed.setDescription(description);
                const mentionContent = target && target.id !== author.id ? `${target.toString()}` : undefined;
                if (interactionOrMessage instanceof Message) {
                    await interactionOrMessage.reply({ content: mentionContent, embeds: [embed] });
                }
                else {
                    await interactionOrMessage.reply({ content: mentionContent, embeds: [embed] });
                }
            }
            catch (error) {
                logger.error(`Erro no comando de roleplay ${config.name}:`, error);
                const msg = '❌ Não consegui carregar a animação. Tente novamente!';
                if (interactionOrMessage instanceof Message)
                    await interactionOrMessage.reply(msg);
                else
                    await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
        }
    };
}
//# sourceMappingURL=template.js.map