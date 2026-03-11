import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, TextChannel, PermissionsBitField, Attachment ,
    MessageFlags
} from 'discord.js';
import { Command } from '../types.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

async function replyOrSend(interactionOrMessage: ChatInputCommandInteraction | Message, content: string | { content?: string; embeds?: EmbedBuilder[] }) {
  if (interactionOrMessage instanceof Message) {
    const channel = interactionOrMessage.channel;
    if (channel.isTextBased() && 'send' in channel) {
      await (channel as any).send(content);
    }
  } else {
    if (interactionOrMessage.deferred || interactionOrMessage.replied) {
      await interactionOrMessage.editReply(typeof content === 'string' ? { content } : content);
    } else {
      await interactionOrMessage.reply(typeof content === 'string' ? { content } : content);
    }
  }
}

export const sayCommand: Command = {
  name: 'say',
  description: 'Envia uma mensagem em um canal, para um usuário ou anúncio global',
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Envia uma mensagem em um canal, para um usuário ou anúncio global')
    .addStringOption(option =>
      option
        .setName('mensagem')
        .setDescription('Mensagem a ser enviada')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal onde enviar a mensagem')
        .setRequired(false)
    )
    .addUserOption(option =>
      option
        .setName('usuário')
        .setDescription('Usuário para enviar a mensagem (DM)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('anuncio')
        .setDescription('Enviar para TODOS os membros via DM (Apenas Administradores)')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName('anexo')
        .setDescription('Anexo a ser enviado')
        .setRequired(false)
    ),

  async execute(interactionOrMessage, client, database, args) {
    const member = interactionOrMessage.member;

    if (!member || !(member.permissions instanceof PermissionsBitField) || !member.permissions.has('Administrator')) {
      await replyOrSend(interactionOrMessage, {
        content: '❌ Permissão negada. Requer administrador.'
      });
      return;
    }

    let messageText: string = '';
    let targetChannel: TextChannel | null = null;
    let targetUser: string | null = null;
    let isAnnouncement: boolean = false;
    let attachment: Attachment | null = null;

    if (interactionOrMessage instanceof Message) {
      // rg!say <mensagem> <#canal|@usuário|all> [anexo]
      const fullArgs = args?.join(' ') || '';
      isAnnouncement = fullArgs.toLowerCase().includes('all');

      const mentionIndex = args?.findIndex(arg => arg.startsWith('<#') || arg.startsWith('<@') || arg.toLowerCase() === 'all') ?? -1;

      if (mentionIndex === -1) {
        await replyOrSend(interactionOrMessage, {
          content: '❌ Uso: `rg!say <mensagem> <#canal|@usuário|all>`'
        });
        return;
      }

      messageText = args?.slice(0, mentionIndex).join(' ') || '';
      const mention = args?.[mentionIndex] || '';

      if (mention.startsWith('<#')) {
        const channelId = mention.replace(/[<#>]/g, '');
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased() && !channel.isDMBased()) targetChannel = channel as TextChannel;
      } else if (mention.startsWith('<@')) {
        targetUser = mention.replace(/[<@!>]/g, '');
      }

      if (interactionOrMessage.attachments.size > 0) {
        attachment = Array.from(interactionOrMessage.attachments.values())[0];
      }
    } else {
      messageText = interactionOrMessage.options.getString('mensagem', true);
      const channelOption = interactionOrMessage.options.getChannel('canal');
      const userOption = interactionOrMessage.options.getUser('usuário');
      isAnnouncement = interactionOrMessage.options.getBoolean('anuncio') || false;
      attachment = interactionOrMessage.options.getAttachment('anexo');

      if (channelOption && 'isTextBased' in channelOption && channelOption.isTextBased() && !channelOption.isDMBased()) {
        targetChannel = channelOption as TextChannel;
      } else if (userOption) {
        targetUser = userOption.id;
      }
    }

    if (isAnnouncement) {
      if (interactionOrMessage instanceof ChatInputCommandInteraction) await interactionOrMessage.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interactionOrMessage.guild;
      if (!guild) return;

      const members = await guild.members.fetch();
      const humanMembers = members.filter(m => !m.user.bot);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle(`📢 Anúncio de ${guild.name}`)
        .setDescription(messageText)
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      let success = 0;
      let failed = 0;

      for (const [id, m] of humanMembers) {
        try {
          const content: any = { embeds: [embed] };
          if (attachment) content.files = [{ attachment: attachment.url, name: attachment.name }];
          await m.send(content);
          success++;
        } catch {
          failed++;
        }
      }

      await replyOrSend(interactionOrMessage, {
        content: `✅ Anúncio finalizado.\nEnviado para: **${success}** membros.\nFalhas (DM fechada): **${failed}** membros.`
      });
      return;
    }

    try {
      if (targetUser) {
        const user = await client.users.fetch(targetUser);
        const content: any = { content: messageText };
        if (attachment) content.files = [{ attachment: attachment.url, name: attachment.name }];
        await user.send(content);
        await replyOrSend(interactionOrMessage, `✅ Mensagem enviada para **${user.username}**.`);
      } else if (targetChannel) {
        await targetChannel.send(messageText);
        await replyOrSend(interactionOrMessage, `✅ Mensagem enviada em **#${targetChannel.name}**.`);
      } else {
        // Default to current channel
        const channel = interactionOrMessage.channel as TextChannel;
        await channel.send(messageText);
        if (interactionOrMessage instanceof ChatInputCommandInteraction) {
          await interactionOrMessage.reply({ content: '✅ Mensagem enviada.', flags: MessageFlags.Ephemeral });
        }
      }
    } catch (error) {
      logger.error('Erro no comando say:', error);
      await replyOrSend(interactionOrMessage, '❌ Erro ao enviar mensagem.');
    }
  }
};
