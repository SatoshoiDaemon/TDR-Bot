import { SlashCommandBuilder, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { QuestService } from '../../services/questService.js';
import { questConfig } from '../../shared/config/yamlLoader.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const questsCommand = {
    name: 'quests',
    description: 'Veja suas missões diárias e resgate recompensas',
    data: new SlashCommandBuilder()
        .setName('quests')
        .setDescription('Veja suas missões diárias e resgate recompensas'),
    async execute(interactionOrMessage, client) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const guildId = interactionOrMessage.guildId;
        const member = interactionOrMessage.member;
        if (!member || !QuestService.isEligible(member)) {
            const msg = '❌ Você não possui o cargo necessário para participar das Daily Quests.';
            if (interactionOrMessage instanceof Message)
                await interactionOrMessage.reply(msg);
            else
                await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            return;
        }
        // Garantir que as missões existam
        await QuestService.generateDailyQuests(userId, guildId);
        const quests = await prisma.userQuest.findMany({
            where: {
                userId,
                guildId,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'asc' }
        });
        const embed = new EmbedBuilder()
            .setTitle('📜 Suas Missões Diárias')
            .setColor(EMBED_COLORS.PRIMARY)
            .setDescription('Complete as missões abaixo para ganhar recompensas em dracmas e XP!')
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        const row = new ActionRowBuilder();
        let hasClaimable = false;
        quests.forEach((quest, index) => {
            const config = questConfig.quest_types[quest.type];
            const progress = Math.min(100, (quest.currentValue / quest.targetValue) * 100);
            const progressBar = questsCommand.getProgressBar(progress);
            const status = quest.isClaimed ? '✅ Resgatado' : quest.isCompleted ? '🎁 Pronto para Resgatar' : '⏳ Em progresso';
            embed.addFields({
                name: `${index + 1}. ${config.name}`,
                value: `${config.description.replace('{target}', quest.targetValue.toString())}\n` +
                    `${progressBar} \`${quest.currentValue}/${quest.targetValue}\`\n` +
                    `💰 **${quest.rewardMoney} Dracmas** | ✨ **${quest.rewardXP} XP**\n` +
                    `Status: **${status}**`
            });
            if (quest.isCompleted && !quest.isClaimed) {
                hasClaimable = true;
                row.addComponents(new ButtonBuilder()
                    .setCustomId(`claim_quest_${quest.id}`)
                    .setLabel(`Resgatar #${index + 1}`)
                    .setStyle(ButtonStyle.Success));
            }
        });
        const response = interactionOrMessage instanceof Message
            ? await interactionOrMessage.reply({ embeds: [embed], components: hasClaimable ? [row] : [] })
            : await interactionOrMessage.reply({ embeds: [embed], components: hasClaimable ? [row] : [], fetchReply: true });
        if (hasClaimable) {
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });
            collector.on('collect', async (i) => {
                try {
                    if (i.user.id !== userId) {
                        return await i.reply({ content: '❌ Esta não é sua missão!', flags: MessageFlags.Ephemeral });
                    }
                    const questId = i.customId.replace('claim_quest_', '');
                    const result = await QuestService.claimReward(questId, i.member);
                    if (result) {
                        await i.update({
                            content: `✅ Você resgatou **${result.money} Dracmas** e **${result.xp} XP**!`,
                            embeds: [],
                            components: []
                        });
                    }
                    else {
                        await i.reply({ content: '❌ Não foi possível resgatar esta recompensa.', flags: MessageFlags.Ephemeral });
                    }
                }
                catch (err) {
                    logger.error('Erro ao resgatar missão:', err);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '❌ Erro ao processar resgate.', flags: MessageFlags.Ephemeral }).catch(() => { });
                    }
                }
            });
        }
    },
    getProgressBar(percent) {
        const size = 10;
        const progress = Math.round(size * (percent / 100));
        const emptyProgress = size - progress;
        const progressText = '▰'.repeat(progress);
        const emptyProgressText = '▱'.repeat(emptyProgress);
        return `\`${progressText}${emptyProgressText}\` \`${Math.round(percent)}%\``;
    }
};
//# sourceMappingURL=quests.js.map