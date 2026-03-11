import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, GuildMember ,
    MessageFlags
} from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';
import axios from 'axios';

export interface RoleplayConfig {
  name: string;
  description: string;
  actionText: string; // Ex: "{user} deu um abraço em {target}"
  soloText?: string;   // Ex: "{user} está chorando" (para comandos como cry)
  apiEndpoint: string; // Endpoint da waifu.pics (ex: sfw/hug)
}

export function createRoleplayCommand(config: RoleplayConfig) {
  return {
    name: config.name,
    description: config.description,
    data: new SlashCommandBuilder()
      .setName(config.name)
      .setDescription(config.description)
      .addUserOption(o => o.setName('user').setDescription('Usuário para interagir')),

    async execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]) {
      const author = interactionOrMessage instanceof Message ? interactionOrMessage.author : interactionOrMessage.user;
      let target: GuildMember | null = null;

      if (interactionOrMessage instanceof Message) {
        target = interactionOrMessage.mentions.members?.first() || null;
      } else {
        target = interactionOrMessage.options.getMember('user') as GuildMember;
      }

      try {
        const response = await axios.get(`https://api.waifu.pics/${config.apiEndpoint}`);
        const imageUrl = (response.data as any).url;

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
          } else {
            description = config.actionText
              .replace(/{user}/g, author.toString())
              .replace(/{target}/g, target.toString());
          }
        } else {
          description = config.soloText
            ? config.soloText.replace(/{user}/g, author.toString())
            : `${author.toString()} está procurando alguém para ${config.name}...`;
        }

        embed.setDescription(description);

        const mentionContent = target && target.id !== author.id ? `${target.toString()}` : undefined;

        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply({ content: mentionContent, embeds: [embed] });
        } else {
          await interactionOrMessage.reply({ content: mentionContent, embeds: [embed] });
        }

      } catch (error) {
        logger.error(`Erro no comando de roleplay ${config.name}:`, error);
        const msg = '❌ Não consegui carregar a animação. Tente novamente!';
        if (interactionOrMessage instanceof Message) await interactionOrMessage.reply(msg);
        else await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    }
  };
}
