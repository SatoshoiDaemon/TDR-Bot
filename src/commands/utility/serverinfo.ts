import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ChannelType } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export const serverinfoCommand = {
  name: 'serverinfo',
  description: 'Exibe informações detalhadas sobre o servidor',
  aliases: ['si', 'guildinfo'],
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Exibe informações detalhadas sobre o servidor'),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const guild = interactionOrMessage.guild;
    if (!guild) return;

    const owner = await guild.fetchOwner();
    const members = await guild.members.fetch();
    const channels = guild.channels.cache;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle(`Informações do Servidor — ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: '👑 Dono', value: `${owner.user.tag} (${owner.id})`, inline: true },
        { name: '📅 Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🆔 ID do Servidor', value: guild.id, inline: true },
        { 
          name: '👥 Membros', 
          value: `Total: **${guild.memberCount}**\n👤 Humanos: **${members.filter(m => !m.user.bot).size}**\n🤖 Bots: **${members.filter(m => m.user.bot).size}**`, 
          inline: true 
        },
        { 
          name: '💬 Canais', 
          value: `Texto: **${channels.filter(c => c.type === ChannelType.GuildText).size}**\nVoz: **${channels.filter(c => c.type === ChannelType.GuildVoice).size}**\nCategorias: **${channels.filter(c => c.type === ChannelType.GuildCategory).size}**`, 
          inline: true 
        },
        { 
          name: '🚀 Boost', 
          value: `Nível: **${guild.premiumTier}**\nBoosts: **${guild.premiumSubscriptionCount || 0}**`, 
          inline: true 
        }
      )
      .setFooter({ text: EMBED_CREDIT })
      .setTimestamp();

    if (interactionOrMessage instanceof Message) {
      await interactionOrMessage.reply({ embeds: [embed] });
    } else {
      await interactionOrMessage.reply({ embeds: [embed] });
    }
  }
};
