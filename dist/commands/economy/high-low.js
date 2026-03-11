import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { EconomyService } from '../../services/economyService.js';
import { economyConfig } from '../../shared/config/yamlLoader.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const highLowCommand = {
    name: 'high-low',
    description: 'Adivinhe se o número do bot é maior (High), menor (Low) ou igual (Tie) ao seu!',
    data: new SlashCommandBuilder()
        .setName('high-low')
        .setDescription('Adivinhe se o número do bot é maior, menor ou igual ao seu!')
        .addIntegerOption(o => o.setName('bet').setDescription('Valor da aposta').setRequired(true)),
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const bet = interactionOrMessage instanceof Message ? parseInt(interactionOrMessage.args?.[0]) : interactionOrMessage.options.getInteger('bet') || 0;
        if (isNaN(bet) || bet < economyConfig.bets.min_bet) {
            return interactionOrMessage.reply(`❌ Aposta mínima: ${economyConfig.bets.min_bet} Dracmas.`);
        }
        if (bet > economyConfig.bets.max_bet) {
            return interactionOrMessage.reply(`❌ Aposta máxima: ${economyConfig.bets.max_bet} Dracmas.`);
        }
        const balance = await EconomyService.getBalance(userId);
        if (balance.wallet < BigInt(bet)) {
            return interactionOrMessage.reply('❌ Saldo insuficiente na carteira.');
        }
        await EconomyService.addMoney(userId, -bet, 'wallet');
        logger.info(`[HighLow] ${userId} apostou ${bet} Dracmas`);
        // Incrementar Missão de Jogos
        try {
            const { QuestService, QuestType } = await import('../../services/questService.js');
            await QuestService.incrementProgress(userId, interactionOrMessage.guildId, QuestType.GAMES, 1);
        }
        catch (e) {
            logger.error('[HighLow] Erro ao incrementar quest:', e);
        }
        const playerNumber = Math.floor(Math.random() * 100) + 1;
        const botNumber = Math.floor(Math.random() * 100) + 1;
        // Calcula multiplicadores dinâmicos baseados nas probabilidades
        const probLower = Math.max(1, playerNumber - 1) / 100;
        const probHigher = Math.max(1, 100 - playerNumber) / 100;
        // Max capped multipliers for very low probabilities (to avoid abuse)
        const multLower = parseFloat(Math.min(10, (1 / probLower) * 0.95).toFixed(2));
        const multHigher = parseFloat(Math.min(10, (1 / probHigher) * 0.95).toFixed(2));
        const multTie = 15.00; // Fixed multiplier for exact tie
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('📈 High or Low 📉')
            .setDescription(`Seu número é **${playerNumber}** (de 1 a 100)\n\n` +
            `O bot tirou um número secreto. Você acha que o dele é Maior, Menor ou Igual ao seu?\n\n` +
            `**Multiplicadores:**\n` +
            `🔼 **Maior**: ${multHigher}x\n` +
            `🔽 **Menor**: ${multLower}x\n` +
            `♊ **Igual**: ${multTie}x`)
            .setFooter({ text: `${EMBED_CREDIT} · Aposta: ${bet} Dracmas` });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('hl_higher').setLabel('Maior').setEmoji('🔼').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('hl_lower').setLabel('Menor').setEmoji('🔽').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('hl_tie').setLabel('Igual').setEmoji('♊').setStyle(ButtonStyle.Secondary));
        const response = await interactionOrMessage.reply({ embeds: [embed], components: [row], fetchReply: true });
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000,
            filter: (i) => i.user.id === userId
        });
        let isProcessing = false;
        collector.on('collect', async (i) => {
            if (isProcessing)
                return await i.deferUpdate().catch(() => { });
            isProcessing = true;
            collector.stop('answered');
            try {
                const choice = i.customId; // hl_higher, hl_lower, hl_tie
                let isWin = false;
                let chosenMultiplier = 0;
                if (choice === 'hl_higher') {
                    isWin = botNumber > playerNumber;
                    chosenMultiplier = multHigher;
                }
                else if (choice === 'hl_lower') {
                    isWin = botNumber < playerNumber;
                    chosenMultiplier = multLower;
                }
                else if (choice === 'hl_tie') {
                    isWin = botNumber === playerNumber;
                    chosenMultiplier = multTie;
                }
                const resultEmbed = new EmbedBuilder()
                    .setTitle('📈 High or Low 📉')
                    .addFields({ name: 'Seu Número', value: `**${playerNumber}**`, inline: true }, { name: 'Número do Bot', value: `**${botNumber}**`, inline: true })
                    .setFooter({ text: EMBED_CREDIT });
                if (isWin) {
                    const winAmount = Math.floor(bet * chosenMultiplier);
                    await EconomyService.addMoney(userId, winAmount, 'wallet');
                    resultEmbed.setColor(EMBED_COLORS.SUCCESS)
                        .setDescription(`🎉 **Você acertou!**\nGanhou **${winAmount} Dracmas** (${chosenMultiplier}x)`);
                    logger.info(`[HighLow] ${userId} ganhou ${winAmount} Dracmas (${chosenMultiplier}x)`);
                }
                else {
                    resultEmbed.setColor(EMBED_COLORS.ERROR)
                        .setDescription(`😔 **Você errou!**\nPerdeu **${bet} Dracmas**.`);
                    logger.info(`[HighLow] ${userId} perdeu ${bet} Dracmas`);
                }
                await i.update({ embeds: [resultEmbed], components: [] });
            }
            catch (err) {
                logger.error('[HighLow] Erro:', err);
                if (!i.replied && !i.deferred)
                    await i.reply({ content: '❌ Erro.', flags: MessageFlags.Ephemeral });
            }
        });
        collector.on('end', async (_collected, reason) => {
            collector.removeAllListeners();
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder().setColor(EMBED_COLORS.ERROR).setDescription('⏱️ **Tempo esgotado!** Você demorou muito e perdeu sua aposta por W.O.');
                try {
                    if (response instanceof Message) {
                        await response.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                    else if (interactionOrMessage instanceof ChatInputCommandInteraction) {
                        await interactionOrMessage.editReply({ embeds: [timeoutEmbed], components: [] });
                    }
                }
                catch (err) {
                    logger.error('[HighLow] Erro ao editar mensagem de timeout:', err);
                }
            }
        });
    }
};
//# sourceMappingURL=high-low.js.map