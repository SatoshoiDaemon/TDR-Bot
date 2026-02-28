import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { EconomyService } from '../../services/economyService.js';
import { economyConfig } from '../../shared/config/yamlLoader.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
/**
 * Comando de Blackjack - Jogo de cartas contra o dealer
 *
 * Funcionalidades:
 * - Aposta mínima configurável
 * - Sistema de Hit/Stand
 * - Lógica de Ás (1 ou 11)
 * - Devolução de aposta em caso de timeout
 * - Pagamento 2x em vitória
 */
export const blackjackCommand = {
    name: 'blackjack',
    description: 'Jogue Blackjack contra o bot',
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Jogue Blackjack contra o bot')
        .addIntegerOption(o => o.setName('bet').setDescription('Valor da aposta').setRequired(true)),
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const bet = interactionOrMessage instanceof Message ? parseInt(interactionOrMessage.args?.[0]) : interactionOrMessage.options.getInteger('bet') || 0;
        // Validação de aposta mínima
        if (isNaN(bet) || bet < economyConfig.bets.min_bet) {
            return interactionOrMessage.reply(`❌ Aposta mínima: ${economyConfig.bets.min_bet} Dracmas.`);
        }
        if (bet > economyConfig.bets.max_bet) {
            return interactionOrMessage.reply(`❌ Aposta máxima: ${economyConfig.bets.max_bet} Dracmas.`);
        }
        // Verificação de saldo
        const balance = await EconomyService.getBalance(userId);
        if (balance.wallet < BigInt(bet)) {
            return interactionOrMessage.reply('❌ Saldo insuficiente na carteira.');
        }
        // Descontar aposta inicial
        await EconomyService.addMoney(userId, -bet, 'wallet');
        logger.info(`[Blackjack] ${userId} iniciou jogo com aposta de ${bet} Dracmas`);
        // Incrementar Missão de Jogos
        try {
            const { QuestService, QuestType } = await import('../../services/questService.js');
            await QuestService.incrementProgress(userId, interactionOrMessage.guildId, QuestType.GAMES, 1);
        }
        catch (e) {
            logger.error('[Blackjack] Erro ao incrementar quest:', e);
        }
        // Configuração do baralho e funções auxiliares
        const deck = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const getCard = () => deck[Math.floor(Math.random() * deck.length)];
        /**
         * Calcula o valor total de uma mão, considerando Ases como 1 ou 11
         */
        const getValue = (hand) => {
            let val = 0;
            let aces = 0;
            for (const card of hand) {
                if (card === 'A')
                    aces++;
                else if (['J', 'Q', 'K'].includes(card))
                    val += 10;
                else
                    val += parseInt(card);
            }
            // Otimizar valor dos Ases
            for (let i = 0; i < aces; i++) {
                if (val + 11 <= 21)
                    val += 11;
                else
                    val += 1;
            }
            return val;
        };
        // Distribuir cartas iniciais
        const playerHand = [getCard(), getCard()];
        const dealerHand = [getCard(), getCard()];
        /**
         * Cria o embed do jogo
         * @param showDealer - Se true, mostra todas as cartas do dealer
         */
        const createEmbed = (showDealer = false) => {
            const pVal = getValue(playerHand);
            const dVal = showDealer ? getValue(dealerHand) : '??';
            const dHandStr = showDealer ? dealerHand.join(' ') : `${dealerHand[0]} ❓`;
            return new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('🃏 Blackjack')
                .addFields({ name: `Sua mão (${pVal})`, value: playerHand.join(' '), inline: true }, { name: `Dealer (${dVal})`, value: dHandStr, inline: true })
                .setFooter({ text: `${EMBED_CREDIT} · Aposta: ${bet} Dracmas` });
        };
        // Botões de ação
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary));
        const response = await interactionOrMessage.reply({ embeds: [createEmbed()], components: [row], fetchReply: true });
        // Collector com filtro de usuário
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000,
            filter: (i) => i.user.id === userId
        });
        let gameOver = false;
        let isProcessing = false;
        collector.on('collect', async (i) => {
            if (isProcessing || gameOver) {
                return await i.deferUpdate().catch(() => { });
            }
            isProcessing = true;
            try {
                if (i.customId === 'bj_hit') {
                    // Jogador pede mais uma carta
                    playerHand.push(getCard());
                    const playerValue = getValue(playerHand);
                    if (playerValue > 21) {
                        // Estouro - jogador perde
                        gameOver = true;
                        collector.stop('bust');
                        await i.update({
                            embeds: [createEmbed(true)
                                    .setColor(EMBED_COLORS.ERROR)
                                    .setDescription('💥 **Estourou!** Você passou de 21. Aposta perdida.')
                            ],
                            components: []
                        });
                        logger.info(`[Blackjack] ${userId} estourou com ${playerValue}`);
                    }
                    else {
                        // Continua o jogo
                        await i.update({ embeds: [createEmbed()], components: [row] });
                    }
                }
                else if (i.customId === 'bj_stand') {
                    // Jogador para - vez do dealer
                    gameOver = true;
                    collector.stop('stand');
                    let dVal = getValue(dealerHand);
                    // Dealer compra até ter 17 ou mais
                    while (dVal < 17) {
                        dealerHand.push(getCard());
                        dVal = getValue(dealerHand);
                    }
                    const pVal = getValue(playerHand);
                    const finalEmbed = createEmbed(true);
                    // Determinar vencedor
                    if (dVal > 21 || pVal > dVal) {
                        // Vitória do jogador
                        await EconomyService.addMoney(userId, bet * 2, 'wallet');
                        finalEmbed.setColor(EMBED_COLORS.SUCCESS)
                            .setDescription(`🎉 **Vitória!** Você ganhou **${bet * 2} Dracmas**.`);
                        logger.info(`[Blackjack] ${userId} venceu e ganhou ${bet * 2} Dracmas`);
                    }
                    else if (pVal === dVal) {
                        // Empate - devolve aposta
                        await EconomyService.addMoney(userId, bet, 'wallet');
                        finalEmbed.setColor(EMBED_COLORS.WARNING)
                            .setDescription('🤝 **Empate!** Aposta devolvida.');
                        logger.info(`[Blackjack] ${userId} empatou, aposta devolvida`);
                    }
                    else {
                        // Derrota
                        finalEmbed.setColor(EMBED_COLORS.ERROR)
                            .setDescription(`😔 **Dealer venceu.** Perda: **${bet} Dracmas**.`);
                        logger.info(`[Blackjack] ${userId} perdeu ${bet} Dracmas`);
                    }
                    await i.update({ embeds: [finalEmbed], components: [] });
                }
            }
            catch (err) {
                logger.error('[Blackjack] Erro no collector:', err);
                // Tentar responder com mensagem de erro
                try {
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
                    }
                }
                catch (replyErr) {
                    logger.error('[Blackjack] Erro ao enviar mensagem de erro:', replyErr);
                }
            }
            finally {
                isProcessing = false;
            }
        });
        collector.on('end', async (_collected, reason) => {
            // Timeout - perder aposta (Corrige exploit onde o player deixa o tempo acabar se a mão for ruim para não perder saldo)
            if (reason === 'time' && !gameOver) {
                logger.info(`[Blackjack] ${userId} timeout, aposta perdida`);
                const timeoutEmbed = createEmbed(false)
                    .setColor(EMBED_COLORS.ERROR)
                    .setDescription('⏱️ **Tempo esgotado!** Você demorou muito para jogar e perdeu a aposta por W.O.');
                try {
                    // Corrigido: editar a mensagem original corretamente
                    if (response instanceof Message) {
                        await response.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                    else {
                        // Para interações, usar editReply no objeto original
                        if (interactionOrMessage instanceof ChatInputCommandInteraction) {
                            await interactionOrMessage.editReply({ embeds: [timeoutEmbed], components: [] });
                        }
                    }
                }
                catch (err) {
                    logger.error('[Blackjack] Erro ao editar mensagem de timeout:', err);
                }
            }
        });
    }
};
//# sourceMappingURL=blackjack.js.map