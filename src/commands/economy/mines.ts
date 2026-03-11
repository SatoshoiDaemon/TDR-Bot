import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
  MessageFlags
} from 'discord.js';
import { EconomyService } from '@services/economyService.js';
import { economyConfig } from '@shared/config/yamlLoader.js';
import { prisma } from '@database/client.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

/**
 * Comando Mines - Jogo de campo minado com multiplicadores
 * 
 * Funcionalidades:
 * - Grade 5x5 com bombas configuráveis
 * - Sistema de multiplicadores progressivos
 * - Cashout a qualquer momento
 * - Proteção contra cliques múltiplos
 * - Taxa da casa de 5%
 */
export const minesCommand = {
  name: 'mines',
  description: 'Jogue o jogo das minas e multiplique seu dracmas',
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Jogue o jogo das minas e multiplique seu dracmas')
    .addIntegerOption(o => o.setName('bet').setDescription('Valor da aposta').setRequired(true))
    .addIntegerOption(o => o.setName('bombs').setDescription('Quantidade de bombas (1-24)').setRequired(true)),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
    const bet = interactionOrMessage instanceof Message ? parseInt((interactionOrMessage as any).args?.[0]) : interactionOrMessage.options.getInteger('bet') || 0;
    const bombsCount = interactionOrMessage instanceof Message ? parseInt((interactionOrMessage as any).args?.[1]) : interactionOrMessage.options.getInteger('bombs') || 3;

    // Validações de entrada
    if (isNaN(bet) || bet < economyConfig.bets.min_bet) {
      return interactionOrMessage.reply(`❌ Aposta mínima: ${economyConfig.bets.min_bet} Dracmas.`);
    }
    if (bet > economyConfig.bets.max_bet) {
      return interactionOrMessage.reply(`❌ Aposta máxima: ${economyConfig.bets.max_bet} Dracmas.`);
    }
    if (bombsCount < 1 || bombsCount > 24) {
      return interactionOrMessage.reply('❌ Quantidade de bombas deve estar entre 1 e 24.');
    }

    // Verificação de saldo
    const balance = await EconomyService.getBalance(userId);
    if (balance.wallet < BigInt(bet)) {
      return interactionOrMessage.reply('❌ Saldo insuficiente na carteira.');
    }

    // Descontar aposta inicial
    await EconomyService.addMoney(userId, -bet, 'wallet');
    logger.info(`[Mines] ${userId} iniciou jogo - Aposta: ${bet} Dracmas, Bombas: ${bombsCount}`);

    // Incrementar Missão de Jogos
    try {
      const { QuestService, QuestType } = await import('@services/questService.js');
      await QuestService.incrementProgress(userId, interactionOrMessage.guildId!, QuestType.GAMES, 1);
    } catch (e: any) {
      logger.error('[Mines] Erro ao incrementar quest:', e);
    }

    // Criar grade 5x4 (20 células) para caber o botão de cashout na 5ª linha
    // 4 linhas de 5 botões = 20 botões.
    const GRID_SIZE = 20;
    const grid = Array(GRID_SIZE).fill('💎');
    const bombsIndices = new Set<number>();
    while (bombsIndices.size < bombsCount) {
      bombsIndices.add(Math.floor(Math.random() * GRID_SIZE));
    }
    bombsIndices.forEach(idx => grid[idx] = '💣');

    // Estado do jogo
    let revealed = 0;
    let gameOver = false;
    let cashedOut = false;

    /**
     * Calcula o multiplicador baseado em casas reveladas e bombas
     * Fórmula: Probabilidade cumulativa com taxa da casa de 5%
     */
    const calculateMultiplier = (rev: number, bombs: number) => {
      const total = GRID_SIZE;
      const safe = total - bombs;
      let mult = 1.0;

      for (let i = 0; i < rev; i++) {
        mult *= (total - i) / (safe - i);
      }

      return parseFloat((mult * 0.95).toFixed(2)); // 5% de taxa da casa
    };

    /**
     * Cria as linhas de botões da grade
     * @param revealedIndices - Índices já revelados
     * @param explodedIdx - Índice da bomba que explodiu (se houver)
     */
    const createRows = (revealedIndices: Set<number>, explodedIdx: number | null = null) => {
      const rows = [];
      // 4 linhas de 5 colunas
      for (let i = 0; i < 4; i++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let j = 0; j < 5; j++) {
          const idx = i * 5 + j;
          const btn = new ButtonBuilder()
            .setCustomId(`mines_${idx}`)
            .setLabel('?')
            .setStyle(ButtonStyle.Secondary);

          if (revealedIndices.has(idx)) {
            // Casa já revelada
            btn.setLabel(grid[idx]).setDisabled(true);
            btn.setStyle(grid[idx] === '💎' ? ButtonStyle.Success : ButtonStyle.Danger);
          } else if (gameOver || cashedOut) {
            // Jogo acabou - revelar tudo
            btn.setLabel(grid[idx]).setDisabled(true);
            if (grid[idx] === '💣') btn.setStyle(ButtonStyle.Danger);
          }

          // Destacar bomba que explodiu
          if (idx === explodedIdx) {
            btn.setStyle(ButtonStyle.Primary);
          }

          row.addComponents(btn);
        }
        rows.push(row);
      }
      return rows;
    };

    // Botão de cashout
    const cashoutBtn = new ButtonBuilder()
      .setCustomId('mines_cashout')
      .setLabel('💰 Cashout')
      .setStyle(ButtonStyle.Primary);

    const revealedIndices = new Set<number>();

    // Embed inicial
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle('💣 Minas')
      .setDescription(`💰 Aposta: **${bet} Dracmas** | 💣 Bombas: **${bombsCount}**\n📊 Multiplicador: **1.00x**\n\n🎯 Revele as casas seguras!`)
      .setFooter({ text: EMBED_CREDIT })
      .setTimestamp();

    const response = await interactionOrMessage.reply({
      embeds: [embed],
      components: [...createRows(revealedIndices), new ActionRowBuilder<ButtonBuilder>().addComponents(cashoutBtn)]
    });

    // Collector com filtro de usuário
    const collector = (response as any).createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i: any) => i.user.id === userId
    });

    // Flag para evitar race conditions
    let isProcessing = false;

    collector.on('collect', async (i: any) => {
      // Proteção contra cliques múltiplos
      if (isProcessing) {
        return await i.deferUpdate().catch(() => { });
      }
      isProcessing = true;

      try {
        if (i.customId === 'mines_cashout') {
          // Jogador decidiu sacar
          cashedOut = true;
          const finalMult = calculateMultiplier(revealed, bombsCount);
          const winAmount = Math.floor(bet * finalMult);
          await EconomyService.addMoney(userId, winAmount, 'wallet');

          embed.setColor(EMBED_COLORS.SUCCESS)
            .setTitle('💰 Cashout Realizado!')
            .setDescription(`✨ Você revelou **${revealed}** diamantes.\n💵 Ganho: **${winAmount} Dracmas** (${finalMult}x)`);

          await i.update({ embeds: [embed], components: createRows(revealedIndices) });
          collector.stop();
          logger.info(`[Mines] ${userId} fez cashout - Ganho: ${winAmount} Dracmas (${finalMult}x)`);
          return;
        }

        // Revelar casa clicada
        const idx = parseInt(i.customId.split('_')[1]);

        if (revealedIndices.has(idx) || cashedOut || gameOver) {
          return await i.deferUpdate().catch(() => { });
        }

        if (grid[idx] === '💣') {
          // Bomba encontrada - fim de jogo
          gameOver = true;
          embed.setColor(EMBED_COLORS.ERROR)
            .setTitle('💥 Explosão!')
            .setDescription(`💣 Você encontrou uma bomba!\n💸 Perda: **${bet} Dracmas**`);

          await i.update({ embeds: [embed], components: createRows(revealedIndices, idx) });
          collector.stop();
          logger.info(`[Mines] ${userId} explodiu - Perda: ${bet} Dracmas`);
        } else {
          // Diamante encontrado
          revealed++;
          revealedIndices.add(idx);
          const currentMult = calculateMultiplier(revealed, bombsCount);

          if (revealed === (GRID_SIZE - bombsCount)) {
            // Vitória total - todos os diamantes revelados
            cashedOut = true;
            const winAmount = Math.floor(bet * currentMult);
            await EconomyService.addMoney(userId, winAmount, 'wallet');

            embed.setColor(EMBED_COLORS.SUCCESS)
              .setTitle('🏆 Vitória Total!')
              .setDescription(`✨ Você limpou todo o campo!\n💵 Ganho: **${winAmount} Dracmas** (${currentMult}x)`);

            await i.update({ embeds: [embed], components: createRows(revealedIndices) });
            collector.stop();
            logger.info(`[Mines] ${userId} vitória total - Ganho: ${winAmount} Dracmas (${currentMult}x)`);
          } else {
            // Continuar jogo
            embed.setDescription(
              `💰 Aposta: **${bet} Dracmas** | 💣 Bombas: **${bombsCount}**\n` +
              `📊 Multiplicador: **${currentMult}x**\n` +
              `💎 Diamantes: **${revealed}/${GRID_SIZE - bombsCount}**\n\n` +
              `🎯 Continue revelando ou faça Cashout!`
            );

            await i.update({
              embeds: [embed],
              components: [...createRows(revealedIndices), new ActionRowBuilder<ButtonBuilder>().addComponents(cashoutBtn)]
            });
          }
        }
      } catch (err) {
        logger.error('[Mines] Erro no collector:', err);
        // Tentar responder com mensagem de erro
        try {
          if (!i.replied && !i.deferred) {
            await i.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
          }
        } catch (replyErr) {
          logger.error('[Mines] Erro ao enviar mensagem de erro:', replyErr);
        }
      } finally {
        isProcessing = false;
      }
    });

    collector.on('end', async (collected: any, reason: string) => {
      collector.removeAllListeners();
      // Timeout - perder aposta
      if (reason === 'time' && !gameOver && !cashedOut) {
        embed.setColor(EMBED_COLORS.WARNING)
          .setTitle('⏱️ Tempo Esgotado')
          .setDescription('O tempo acabou. Aposta perdida.');

        try {
          if (response instanceof Message) {
            await response.edit({ embeds: [embed], components: [] });
          } else if (interactionOrMessage instanceof ChatInputCommandInteraction) {
            await interactionOrMessage.editReply({ embeds: [embed], components: [] });
          }
        } catch (err) {
          logger.error('[Mines] Erro ao editar mensagem de timeout:', err);
        }

        logger.info(`[Mines] ${userId} timeout - Aposta perdida`);
      }
    });
  }
};
