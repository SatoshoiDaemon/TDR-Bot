import { Message, EmbedBuilder } from 'discord.js';
import { AIService } from '@services/aiService.js';
import { aiConfig } from '@shared/config/yamlLoader.js';
import { logger } from '@shared/logger.js';

const aiService = new AIService();

export class MentionHandler {
  /**
   * Verifica se a mensagem é uma menção ao bot
   */
  static isBotMention(message: Message): boolean {
    if (!message.mentions.users.has(message.client.user!.id)) {
      return false;
    }

    // Verificar canais permitidos/ignorados
    if (aiConfig.mentions.allowed_channels.length > 0) {
      if (!aiConfig.mentions.allowed_channels.includes(message.channel.id)) {
        return false;
      }
    }

    if (aiConfig.mentions.ignored_channels.includes(message.channel.id)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se é uma resposta a uma mensagem do bot
   */
  static isBotReply(message: Message): boolean {
    if (!aiConfig.mentions.respond_to_replies) return false;

    if (!message.reference) return false;

    // Verificar se a mensagem referenciada é do bot
    return message.reference.messageId !== undefined;
  }

  /**
   * Processa menção direta ao bot
   */
  static async handleMention(message: Message): Promise<void> {
    if (!aiConfig.mentions.respond_to_mentions) return;

    try {
      // Remover a menção do bot da mensagem
      const content = message.content
        .replace(new RegExp(`<@!?${message.client.user!.id}>`, 'g'), '')
        .trim();

      // Se não houver conteúdo, mostrar mensagem de ajuda
      if (!content) {
        await this.sendEmptyMentionResponse(message);
        return;
      }

      // Processar com IA
      await this.processWithAI(message, content);

    } catch (error) {
      logger.error('Erro ao processar menção:', error);
      await message.reply('❌ Ocorreu um erro ao processar sua mensagem.');
    }
  }

  /**
   * Processa resposta a mensagem do bot
   */
  static async handleReply(message: Message): Promise<void> {
    try {
      // Buscar mensagem referenciada
      const referencedMessage = await message.channel.messages.fetch(message.reference!.messageId!);

      // Verificar se é do bot
      if (referencedMessage.author.id !== message.client.user!.id) {
        return;
      }

      // Verificar se é uma mensagem da IA (tem embed ou foi enviada pelo sistema de IA)
      const isAIMessage = referencedMessage.embeds.length > 0 &&
        referencedMessage.embeds[0].author?.name === 'Igris AI';

      if (!isAIMessage) return;

      // Processar continuação da conversa
      await this.processWithAI(message, message.content);

    } catch (error) {
      logger.error('Erro ao processar resposta:', error);
    }
  }

  /**
   * Envia resposta quando bot é mencionado sem texto
   */
  private static async sendEmptyMentionResponse(message: Message): Promise<void> {
    const response = aiConfig.mentions.empty_mention_response;

    if (aiConfig.responses.embed_responses) {
      const embed = new EmbedBuilder()
        .setColor(aiConfig.responses.embed_color as any)
        .setAuthor({
          name: 'Igris AI',
          iconURL: message.client.user?.displayAvatarURL()
        })
        .setDescription(response)
        .setTimestamp();

      if (aiConfig.responses.include_footer) {
        embed.setFooter({ text: aiConfig.responses.footer_text });
      }

      await message.reply({ embeds: [embed] });
    } else {
      await message.reply(response);
    }
  }

  /**
   * Processa mensagem com IA
   */
  private static async processWithAI(message: Message, content: string): Promise<void> {
    const userId = message.author.id;
    const username = message.author.username;

    try {
      // Enviar indicador de digitação
      if (aiConfig.responses.typing_indicator && 'sendTyping' in message.channel) {
        await (message.channel as any).sendTyping();
      }

      // Processar com IA
      const response = await aiService.processMessage(userId, username, content);

      // Enviar resposta
      await this.sendAIResponse(message, response);

      logger.info(`IA respondeu menção de ${username}: "${content.substring(0, 50)}..."`);

    } catch (error) {
      logger.error('Erro ao processar com IA:', error);
      await message.reply('❌ Ocorreu um erro ao processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Envia resposta da IA
   */
  private static async sendAIResponse(message: Message, response: string): Promise<void> {
    // Verificar tamanho máximo
    if (response.length > aiConfig.responses.max_length) {
      response = response.substring(0, aiConfig.responses.max_length - 3) + '...';
    }

    if (aiConfig.responses.embed_responses) {
      const embed = new EmbedBuilder()
        .setColor(aiConfig.responses.embed_color as any)
        .setAuthor({
          name: 'Igris AI',
          iconURL: message.client.user?.displayAvatarURL()
        })
        .setDescription(response)
        .setTimestamp();

      if (aiConfig.responses.include_footer) {
        embed.setFooter({ text: aiConfig.responses.footer_text });
      }

      const sent = await message.reply({ embeds: [embed] });

      // Adicionar reações se configurado
      if (aiConfig.responses.add_reactions) {
        for (const reaction of aiConfig.responses.reactions) {
          await sent.react(reaction).catch(() => { });
        }
      }
    } else {
      const content = aiConfig.responses.mention_user
        ? `${message.author}, ${response}`
        : response;

      await message.reply({ content });
    }
  }

  /**
   * Handler principal para mensagens
   */
  static async handle(message: Message): Promise<boolean> {
    // Ignorar bots
    if (message.author.bot) return false;

    // Verificar se é menção direta
    if (this.isBotMention(message)) {
      await this.handleMention(message);
      return true;
    }

    // Verificar se é resposta ao bot
    if (this.isBotReply(message)) {
      await this.handleReply(message);
      return true;
    }

    return false;
  }
}
