import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message ,
    MessageFlags
} from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';
import axios from 'axios';

export const dicioCommand = {
  name: 'dicio',
  description: 'Busca o significado de uma palavra no dicionário',
  aliases: ['dicionario', 'significado', 'definir'],
  data: new SlashCommandBuilder()
    .setName('dicio')
    .setDescription('Busca o significado de uma palavra no dicionário')
    .addStringOption(o => o.setName('palavra').setDescription('A palavra que deseja buscar').setRequired(true)),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]) {
    let word = '';

    if (interactionOrMessage instanceof Message) {
      word = args?.[0] || '';
    } else {
      word = interactionOrMessage.options.getString('palavra', true);
    }

    if (!word) {
      const msg = '❌ Por favor, informe uma palavra para buscar.';
      if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
      return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    try {
      // A API do Dicionário Aberto retorna um array de definições
      const response = await axios.get(`https://api.dicionario-aberto.net/word/${encodeURIComponent(word.toLowerCase())}`);

      if (!response.data || (response.data as any[]).length === 0) {
        const msg = `❌ Não encontrei o significado de "**${word}**".`;
        if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
        return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }

      // Pegar a primeira definição (geralmente a mais relevante)
      const entry = (response.data as any[])[0];

      // A API retorna o XML da definição no campo 'xml'
      // Vamos fazer um tratamento simples para extrair o texto limpo
      let definition = entry.xml || '';

      // Limpeza básica de tags XML comuns na API
      definition = definition
        .replace(/<def>([\s\S]*?)<\/def>/g, '$1\n') // Extrai conteúdo de <def>
        .replace(/<[^>]+>/g, '') // Remove todas as outras tags
        .replace(/\n\s*\n/g, '\n') // Remove linhas vazias excessivas
        .trim();

      if (definition.length > 1000) {
        definition = definition.substring(0, 997) + '...';
      }

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle(`📖 Dicionário — ${word.charAt(0).toUpperCase() + word.slice(1)}`)
        .setDescription(definition || 'Significado encontrado, mas não foi possível formatar o texto.')
        .addFields(
          { name: '🔗 Fonte', value: '[Dicionário Aberto](https://dicionario-aberto.net/)', inline: true }
        )
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      if (interactionOrMessage instanceof Message) {
        await interactionOrMessage.reply({ embeds: [embed] });
      } else {
        await interactionOrMessage.reply({ embeds: [embed] });
      }

    } catch (error) {
      logger.error(`Erro ao buscar palavra "${word}":`, error);
      const msg = '❌ Ocorreu um erro ao consultar o dicionário. Tente novamente mais tarde.';
      if (interactionOrMessage instanceof Message) await interactionOrMessage.reply(msg);
      else await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }
  }
};
