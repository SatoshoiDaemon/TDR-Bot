import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export class ReminderScheduler {
  private client: Client;
  private interval: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start() {
    // Verificar lembretes a cada 30 segundos
    this.interval = setInterval(() => this.checkReminders(), 30000);
    logger.info('Serviço de Lembretes iniciado.');
  }

  async checkReminders() {
    try {
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: {
          time: { lte: now }
        }
      });

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
        await prisma.reminder.delete({ where: { id: reminder.id } });
      }
    } catch (error) {
      logger.error('Erro ao processar lembretes:', error);
    }
  }

  async sendReminder(reminder: any) {
    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (!user) return;

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle('⏰ Lembrete!')
        .setDescription(`Você pediu para ser lembrado de:\n**${reminder.content}**`)
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      if (reminder.dm) {
        try {
          await user.send({ embeds: [embed] });
        } catch (err) {
          // Se falhar a DM, tenta no canal original
          const channel = this.client.channels.cache.get(reminder.channelId) as TextChannel;
          if (channel) {
            await channel.send({ content: `${user}`, embeds: [embed] }).catch(e => logger.error('Erro ao enviar lembrete no canal:', e));
          }
        }
      } else {
        const channel = this.client.channels.cache.get(reminder.channelId) as TextChannel;
        if (channel) {
          await channel.send({ content: `${user}`, embeds: [embed] }).catch(e => logger.error('Erro ao enviar lembrete no canal:', e));
        }
      }
    } catch (error) {
      logger.error(`Falha ao enviar lembrete ${reminder.id}:`, error);
    }
  }
}
