import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message,
  MessageFlags
} from 'discord.js';
import { EconomyService } from '@services/economyService.js';
import { formatDuration } from '@shared/utils/timeUtils.js';
import { EMBED_COLORS } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

/**
 * Comando Daily - Recompensa diária
 * 
 * Funcionalidades:
 * - Recompensa de dracmas e XP a cada 24h
 * - Sistema de cooldown
 * - Verificação de atividade (mensagens)
 * - Histórico de coletas
 */
export const dailyCommand = {
  name: 'daily',
  description: 'Coleta sua recompensa diária de dracmas',
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Coleta sua recompensa diária de dracmas'),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const userId = interactionOrMessage instanceof Message
      ? interactionOrMessage.author.id
      : interactionOrMessage.user.id;

    // Defer para operações de banco de dados (podem demorar mais de 3s)
    if (interactionOrMessage instanceof ChatInputCommandInteraction) {
      await interactionOrMessage.deferReply();
    }

    try {
      // Processar recompensa diária
      const guildId = interactionOrMessage.guildId!;
      const result: any = await EconomyService.daily(userId, guildId);

      if (result.success) {
        // Sucesso - recompensa coletada
        logger.info(`[Daily] ${userId} coletou recompensa: ${result.money} Dracmas, ${result.xp} XP`);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('📅 Recompensa Diária Coletada!')
          .setDescription(
            `🎉 Você recebeu sua recompensa diária!\n\n` +
            `💰 **Dracmas:** ${result.money?.toLocaleString()} Dracmas\n` +
            `⭐ **Experiência:** ${result.xp} XP\n\n` +
            `⏰ Próxima recompensa disponível em **24 horas**.`
          )
          .setTimestamp();

        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply({ embeds: [embed] });
        } else {
          await interactionOrMessage.editReply({ embeds: [embed] });
        }

      } else {
        // Falha - cooldown ou requisitos não atendidos
        let msg = '';

        if (result.reason === 'cooldown') {
          // Ainda em cooldown
          const remaining = formatDuration(result.remaining || 0);
          msg = `⏰ **Aguarde!** Você já coletou sua recompensa de hoje.\n\n` +
            `🕐 Próxima coleta disponível em: **${remaining}**.`;

          logger.info(`[Daily] ${userId} tentou coletar em cooldown (restam ${remaining})`);
        } else if (result.reason === 'messages') {
          // Requisito de mensagens não atendido
          msg = `💬 **Continue conversando!**\n\n` +
            `Para coletar o daily, você precisa ser mais ativo no servidor.\n\n` +
            `📊 **Progresso:** ${result.current}/${result.required} mensagens hoje.`;

          logger.info(`[Daily] ${userId} não atende requisito de mensagens (${result.current}/${result.required})`);
        } else {
          // Erro desconhecido
          msg = '❌ Erro ao coletar recompensa diária. Tente novamente mais tarde.';
          logger.error(`[Daily] Erro desconhecido para ${userId}:`, result);
        }

        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply(msg);
        } else {
          await interactionOrMessage.editReply({ content: msg });
        }
      }
    } catch (error) {
      logger.error(`[Daily] Erro ao processar comando para ${userId}:`, error);

      const errorMsg = '❌ Ocorreu um erro ao processar sua recompensa diária. Tente novamente.';

      try {
        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply(errorMsg);
        } else {
          if (interactionOrMessage.deferred) {
            await interactionOrMessage.editReply({ content: errorMsg });
          } else {
            await interactionOrMessage.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
          }
        }
      } catch (replyErr) {
        logger.error('[Daily] Erro ao enviar mensagem de erro:', replyErr);
      }
    }
  }
};
