import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, GuildMember } from 'discord.js';
import { EMBED_CREDIT } from '@shared/embedTheme.js';

export const userinfoCommand = {
  name: 'userinfo',
  description: 'Exibe informações detalhadas de um usuário',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Exibe informações detalhadas de um usuário')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('O usuário para ver as informações')
        .setRequired(false)),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    let member: GuildMember;

    if (interactionOrMessage instanceof Message) {
      member = interactionOrMessage.mentions.members?.first() || interactionOrMessage.member as GuildMember;
    } else {
      member = (interactionOrMessage.options.getMember('target') as GuildMember) || (interactionOrMessage.member as GuildMember);
    }

    const roles = member.roles.cache
      .filter(role => role.name !== '@everyone')
      .map(role => role.toString())
      .join(', ') || 'Nenhum cargo';

    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || 0x04d9ff)
      .setTitle(`Informações — ${member.user.username}`)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: '🆔 ID', value: member.id, inline: true },
        { name: '🏷️ Tag', value: member.user.tag, inline: true },
        { name: '📅 Conta Criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Entrou no Servidor', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
        { name: '🎭 Cargos', value: roles }
      )
      .setFooter({ text: EMBED_CREDIT })
      .setTimestamp();

    if (interactionOrMessage instanceof Message) {
      const ch = interactionOrMessage.channel;
      if (ch?.isTextBased() && 'send' in ch) await ch.send({ embeds: [embed] });
    } else {
      await interactionOrMessage.reply({ embeds: [embed] });
    }
  }
};
