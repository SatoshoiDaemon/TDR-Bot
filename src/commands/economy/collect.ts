import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, GuildMember ,
    MessageFlags
} from 'discord.js';
import { EconomyService } from '@services/economyService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

/**
 * Comando Collect - Coleta de dracmas por cargos
 * 
 * Funcionalidades:
 * - Coleta baseada em cargos do usuário
 * - Cooldown individual por cargo
 * - Múltiplas coletas simultâneas
 * - Sistema de cache (Redis)
 */
export const collectCommand = {
  name: 'collect',
  description: 'Coleta dracmas baseadas nos seus cargos',
  data: new SlashCommandBuilder()
    .setName('collect')
    .setDescription('Coleta dracmas baseadas nos seus cargos'),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message) {
    const member = interactionOrMessage.member as GuildMember;
    
    // Validar membro
    if (!member) {
      const errorMsg = '❌ Erro ao identificar membro. Tente novamente.';
      if (interactionOrMessage instanceof Message) {
        return interactionOrMessage.reply(errorMsg);
      } else {
        return interactionOrMessage.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
      }
    }

    // Defer para operações de banco e cache
    if (interactionOrMessage instanceof ChatInputCommandInteraction) {
      await interactionOrMessage.deferReply();
    }

    try {
      // Obter IDs dos cargos do membro
      const roleIds = member.roles.cache.map(r => r.id);
      logger.info(`[Collect] ${member.id} tentando coletar (${roleIds.length} cargos)`);
      
      // Processar coleta
      const result = await EconomyService.collect(member.id, roleIds, member.user.username);

      if (result.success) {
        // Sucesso - dracmas coletadas
        logger.info(`[Collect] ${member.id} coletou ${result.amount} Dracmas de ${result.count} cargo(s)`);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('💰 Coleta de Cargos')
          .setDescription(
            `✅ Você coletou com sucesso!\n\n` +
            `💵 **Total:** ${result.amount?.toLocaleString()} Dracmas\n` +
            `🎭 **Cargos:** ${result.count} cargo(s) coletado(s)`
          )
          .setFooter({ text: EMBED_CREDIT })
          .setTimestamp();

        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply({ embeds: [embed] });
        } else {
          await interactionOrMessage.editReply({ embeds: [embed] });
        }
      } else {
        // Falha - sem cargos ou em cooldown
        const msg = result.error || '❌ Erro na coleta.';
        logger.info(`[Collect] ${member.id} falhou: ${msg}`);

        if (interactionOrMessage instanceof Message) {
          await interactionOrMessage.reply(msg);
        } else {
          await interactionOrMessage.editReply({ content: msg });
        }
      }
    } catch (error) {
      logger.error(`[Collect] Erro ao processar comando para ${member.id}:`, error);
      
      const errorMsg = '❌ Ocorreu um erro ao processar a coleta. Tente novamente.';
      
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
        logger.error('[Collect] Erro ao enviar mensagem de erro:', replyErr);
      }
    }
  }
};
