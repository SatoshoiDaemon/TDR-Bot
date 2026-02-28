import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { EconomyService } from '../../services/economyService.js';
import { economyConfig } from '../../shared/config/yamlLoader.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
/**
 * Comando Roulette - Roleta com cores (Vermelho, Preto, Verde)
 *
 * Funcionalidades:
 * - Vermelho e Preto: multiplicador 2x
 * - Verde (0): multiplicador 14x
 * - Distribuição realista de números
 * - Validação completa de entradas
 */
export const rouletteCommand = {
    name: 'roulette',
    description: 'Aposte na roleta (red, black, green)',
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Aposte na roleta (red, black, green)')
        .addIntegerOption(o => o.setName('bet').setDescription('Valor da aposta').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Cor para apostar').setRequired(true)
        .addChoices({ name: '🔴 Vermelho (2x)', value: 'red' }, { name: '⚫ Preto (2x)', value: 'black' }, { name: '🟢 Verde (14x)', value: 'green' })),
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const bet = interactionOrMessage instanceof Message ? parseInt(interactionOrMessage.args?.[0]) : interactionOrMessage.options.getInteger('bet') || 0;
        const color = interactionOrMessage instanceof Message ? interactionOrMessage.args?.[1]?.toLowerCase() : interactionOrMessage.options.getString('color');
        // Validação de aposta
        if (isNaN(bet) || bet < economyConfig.bets.min_bet) {
            return interactionOrMessage.reply(`❌ Aposta mínima: ${economyConfig.bets.min_bet} Dracmas.`);
        }
        if (bet > economyConfig.bets.max_bet) {
            return interactionOrMessage.reply(`❌ Aposta máxima: ${economyConfig.bets.max_bet} Dracmas.`);
        }
        // Validação de cor (corrigido para evitar undefined)
        if (!color || !['red', 'black', 'green'].includes(color)) {
            return interactionOrMessage.reply('❌ Cor inválida! Escolha: `red`, `black` ou `green`.');
        }
        // Verificação de saldo
        const balance = await EconomyService.getBalance(userId);
        if (balance.wallet < BigInt(bet)) {
            return interactionOrMessage.reply('❌ Saldo insuficiente na carteira.');
        }
        // Descontar aposta inicial
        await EconomyService.addMoney(userId, -bet, 'wallet');
        logger.info(`[Roulette] ${userId} apostou ${bet} Dracmas em ${color}`);
        // Incrementar Missão de Jogos
        try {
            const { QuestService, QuestType } = await import('../../services/questService.js');
            await QuestService.incrementProgress(userId, interactionOrMessage.guildId, QuestType.GAMES, 1);
        }
        catch (e) {
            logger.error('[Roulette] Erro ao incrementar quest:', e);
        }
        // Girar a roleta (0-36)
        const outcome = Math.floor(Math.random() * 37);
        // Determinar cor do resultado
        let resultColor = '';
        if (outcome === 0) {
            resultColor = 'green';
        }
        else if ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(outcome)) {
            resultColor = 'red';
        }
        else {
            resultColor = 'black';
        }
        // Verificar vitória
        const win = color === resultColor;
        const multiplier = economyConfig.bets.games.roulette.multipliers[resultColor] || 2;
        // Mapear cores para emojis
        const colorEmoji = {
            'red': '🔴',
            'black': '⚫',
            'green': '🟢'
        };
        // Criar embed de resultado
        const embed = new EmbedBuilder()
            .setTitle('🎰 Roleta')
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        if (win) {
            // Vitória - adicionar ganhos
            const winAmount = bet * multiplier;
            await EconomyService.addMoney(userId, winAmount, 'wallet');
            embed.setColor(EMBED_COLORS.SUCCESS)
                .setDescription(`🎉 **Você ganhou!**\n\n` +
                `${colorEmoji[resultColor]} Resultado: **${resultColor.toUpperCase()} (${outcome})**\n` +
                `💰 Sua aposta: **${bet.toLocaleString()} Dracmas**\n` +
                `📊 Multiplicador: **${multiplier}x**\n` +
                `💵 Ganho: **${winAmount.toLocaleString()} Dracmas**`);
            logger.info(`[Roulette] ${userId} ganhou ${winAmount} Dracmas (${multiplier}x)`);
        }
        else {
            // Derrota
            embed.setColor(EMBED_COLORS.ERROR)
                .setDescription(`😔 **Você perdeu!**\n\n` +
                `${colorEmoji[resultColor]} Resultado: **${resultColor.toUpperCase()} (${outcome})**\n` +
                `💸 Perda: **${bet.toLocaleString()} Dracmas**\n\n` +
                `Tente novamente!`);
            logger.info(`[Roulette] ${userId} perdeu ${bet} Dracmas`);
        }
        await interactionOrMessage.reply({ embeds: [embed] });
    }
};
//# sourceMappingURL=roulette.js.map