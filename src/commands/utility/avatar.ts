import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';
import { Command } from '../types.js';
import { EMBED_COLORS } from '@shared/embedTheme.js';

async function replyOrSend(interactionOrMessage: ChatInputCommandInteraction | Message, content: { embeds?: EmbedBuilder[] }) {
  if (interactionOrMessage instanceof Message) {
    const channel = interactionOrMessage.channel;
    if (channel.isTextBased() && 'send' in channel) {
      await (channel as any).send(content);
    }
  } else {
    await interactionOrMessage.reply(content);
  }
}

export const avatarCommand: Command = {
  name: 'avatar',
  description: 'Exibe o avatar de um usuário',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibe o avatar de um usuário')
    .addUserOption(option =>
      option
        .setName('usuário')
        .setDescription('Usuário para exibir o avatar')
        .setRequired(false)
    ),

  async execute(interactionOrMessage, client, database, args) {
    let targetUser: User | null = null;

    if (interactionOrMessage instanceof Message) {
      // Comando de prefixo
      if (args && args.length > 0) {
        const mention = args[0];
        const userId = mention.replace(/[<@!>]/g, '');
        try {
          targetUser = await client.users.fetch(userId);
        } catch {
          targetUser = null;
        }
      }
      if (!targetUser) {
        targetUser = interactionOrMessage.author;
      }
    } else {
      // Slash command
      targetUser = interactionOrMessage.options.getUser('usuário') || interactionOrMessage.user;
    }

    const avatarURL = targetUser.displayAvatarURL({ size: 4096, extension: 'png' });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle(`Avatar — ${targetUser.username}`)
      .setImage(avatarURL)
      .setTimestamp();

    await replyOrSend(interactionOrMessage, { embeds: [embed] });
  }
};
