import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message ,
    MessageFlags
} from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { LevelService } from '@services/levelService.js';
import { levelingConfig } from '@shared/config/yamlLoader.js';

export const rankCommand = {
  name: 'rank',
  description: 'Mostra seu nível e progresso atual',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra seu nível e progresso atual')
    .addUserOption(option => option.setName('user').setDescription('Usuário para ver o rank')),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const targetUser = interactionOrMessage instanceof Message 
      ? interactionOrMessage.mentions.users.first() || interactionOrMessage.author
      : interactionOrMessage.options.getUser('user') || interactionOrMessage.user;

    const rank = await LevelService.getRank(targetUser.id);

    if (!rank) {
      const msg = 'Usuário sem registro de nível.';
      if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
      return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    const percentage = Math.min(100, Math.floor((rank.xp / rank.xpNeeded) * 100));
    const progressBlocks = Math.floor(percentage / 10);
    const progressBar = '🟦'.repeat(progressBlocks) + '⬛'.repeat(10 - progressBlocks);

    // Encontrar próxima recompensa
    let nextReward = 'Nenhuma';
    if (levelingConfig.level_rewards?.roles) {
      const levels = Object.keys(levelingConfig.level_rewards.roles).map(Number).sort((a, b) => a - b);
      const nextLvl = levels.find(l => l > rank.level);
      if (nextLvl) {
        const roleId = levelingConfig.level_rewards.roles[nextLvl];
        nextReward = `Nível ${nextLvl}: <@&${roleId}>`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setAuthor({ name: `Perfil de Nível — ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
      .addFields(
        { name: '📊 Estatísticas', value: `> **Nível:** \`${rank.level}\`\n> **Posição:** \`#${rank.rankPosition}\`\n> **XP Total:** \`${rank.xp.toLocaleString()}\``, inline: false },
        { name: '🎯 Próxima Recompensa', value: `> ${nextReward}`, inline: false },
        { name: `📈 Progresso (${percentage}%)`, value: `${progressBar} \`${rank.xp.toLocaleString()} / ${rank.xpNeeded.toLocaleString()}\``, inline: false }
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
