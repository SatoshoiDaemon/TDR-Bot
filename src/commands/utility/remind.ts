import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message ,
    MessageFlags
} from 'discord.js';
import { prisma } from '@database/client.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

export const remindCommand = {
  name: 'remind',
  description: 'Define um lembrete',
  aliases: ['lembrar', 'lembrete'],
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Define um lembrete')
    .addStringOption(o => o.setName('conteudo').setDescription('O que devo lembrar?').setRequired(true))
    .addStringOption(o => o.setName('tempo').setDescription('Em quanto tempo? (ex: 10m, 1h, 1d)').setRequired(true))
    .addBooleanOption(o => o.setName('dm').setDescription('Enviar na DM?')),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]) {
    let content = '';
    let timeStr = '';
    let dm = false;

    if (interactionOrMessage instanceof Message) {
      // Formato: remind <conteudo> <tempo> ?dm <true/false>
      // Ex: remind receber daily 12h ?dm true
      const fullArgs = args?.join(' ') || '';
      const dmMatch = fullArgs.match(/\?dm\s+(true|false)/i);
      dm = dmMatch ? dmMatch[1].toLowerCase() === 'true' : false;
      
      const cleanArgs = fullArgs.replace(/\?dm\s+(true|false)/i, '').trim().split(/\s+/);
      timeStr = cleanArgs.pop() || '';
      content = cleanArgs.join(' ');
    } else {
      content = interactionOrMessage.options.getString('conteudo', true);
      timeStr = interactionOrMessage.options.getString('tempo', true);
      dm = interactionOrMessage.options.getBoolean('dm') || false;
    }

    if (!content || !timeStr) {
      const msg = '❌ Uso: `rg!remind <conteúdo> <tempo> [?dm true/false]`\nExemplo: `rg!remind receber daily 12h ?dm true`';
      if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
      return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    const ms = this.parseTime(timeStr);
    if (!ms) {
      const msg = '❌ Tempo inválido. Use formatos como `10m`, `1h`, `1d`.';
      if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
      return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    const targetTime = new Date(Date.now() + ms);

    try {
      await prisma.reminder.create({
        data: {
          userId: interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id,
          content,
          time: targetTime,
          dm,
          channelId: interactionOrMessage.channelId!
        }
      });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.SUCCESS)
        .setTitle('⏰ Lembrete Definido')
        .setDescription(`Vou te lembrar de: **${content}**`)
        .addFields(
          { name: '📅 Quando', value: `<t:${Math.floor(targetTime.getTime() / 1000)}:R>`, inline: true },
          { name: '📩 Enviar na DM', value: dm ? 'Sim' : 'Não', inline: true }
        )
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      if (interactionOrMessage instanceof Message) {
        await interactionOrMessage.reply({ embeds: [embed] });
      } else {
        await interactionOrMessage.reply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Erro ao criar lembrete:', error);
      const msg = '❌ Erro ao definir lembrete.';
      if (interactionOrMessage instanceof Message) await interactionOrMessage.reply(msg);
      else await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }
  },

  parseTime(str: string): number | null {
    const regex = /^(\d+)([smhd])$/i;
    const match = str.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return null;
    }
  }
};
