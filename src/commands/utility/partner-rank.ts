import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { PartnershipService } from '@services/partnershipService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export const partnerRankCommand = {
  name: 'partner-rank',
  description: 'Exibe o ranking de produtividade da staff em parcerias',
  data: new SlashCommandBuilder()
    .setName('partner-rank')
    .setDescription('Exibe o ranking de produtividade da staff em parcerias'),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const ranking = await PartnershipService.getRanking();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle('🏆 Ranking de Parcerias (Staff)')
      .setDescription('Estes são os membros da staff que mais firmaram parcerias para o reino!')
      .setTimestamp()
      .setFooter({ text: EMBED_CREDIT });

    if (ranking.length === 0) {
      embed.setDescription('Nenhuma parceria registrada no ranking ainda.');
    } else {
      const list = ranking.map((s: any, i: number) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤';
        return `${medal} **#${i + 1}** <@${s.userId}> — \`${s.totalPartners}\` parcerias`;
      }).join('\n');
      embed.setDescription(list);
    }

    if (interactionOrMessage instanceof Message) return interactionOrMessage.reply({ embeds: [embed] });
    return interactionOrMessage.reply({ embeds: [embed] });
  }
};
