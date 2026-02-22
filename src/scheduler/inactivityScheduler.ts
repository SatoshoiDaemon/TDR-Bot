import { Client, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class InactivityScheduler {
  private client: Client;
  private config: any;

  constructor(client: Client) {
    this.client = client;
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/inactivity.yml');
      this.config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      logger.error('Erro ao carregar config de inatividade:', error);
      this.config = { enabled: false };
    }
  }

  start() {
    if (!this.config.enabled) return;
    
    // Verificar inatividade uma vez por dia (às 00:00)
    // Para fins de teste/demonstração, vamos rodar a cada 12 horas
    setInterval(() => this.checkInactivity(), 12 * 60 * 60 * 1000);
    logger.info('Serviço de Inatividade iniciado.');
  }

  async checkInactivity() {
    try {
      const inactiveDays = this.config.inactive_days || 7;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);

      // Buscar usuários que não enviam mensagem há X dias
      // Usamos o campo lastMessage do modelo Level
      const inactiveLevels = await prisma.level.findMany({
        where: {
          lastMessage: { lte: thresholdDate }
        },
        include: {
          user: true
        }
      });

      const guild = this.client.guilds.cache.first(); // Assume o servidor principal
      if (!guild) return;

      const notificationChannel = this.config.notification_channel_id 
        ? (guild.channels.cache.get(this.config.notification_channel_id) as TextChannel)
        : null;

      for (const level of inactiveLevels) {
        await this.notifyInactiveMember(level, guild, notificationChannel);
      }
    } catch (error) {
      logger.error('Erro ao processar inatividade:', error);
    }
  }

  private async notifyInactiveMember(level: any, guild: any, channel: TextChannel | null) {
    try {
      const member = await guild.members.fetch(level.userId).catch(() => null);
      if (!member) return;

      const replacePlaceholders = (str: string) => 
        str.replace(/{user}/g, member.toString())
           .replace(/{username}/g, member.user.username)
           .replace(/{server}/g, guild.name)
           .replace(/{days}/g, this.config.inactive_days.toString());

      const embed = new EmbedBuilder()
        .setColor(this.config.message.embed.color || EMBED_COLORS.ERROR)
        .setTitle(replacePlaceholders(this.config.message.embed.title))
        .setDescription(replacePlaceholders(this.config.message.embed.description))
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`feedback_${member.id}`)
        .setLabel(this.config.feedback_button.label)
        .setStyle(ButtonStyle[this.config.feedback_button.style as keyof typeof ButtonStyle] || ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Enviar no canal de notificação se configurado
      if (channel) {
        await channel.send({ 
          content: replacePlaceholders(this.config.message.content),
          embeds: [embed],
          components: [row]
        });
      }

      // Opcional: Enviar na DM (pode ser configurado no futuro)
      // await member.send({ embeds: [embed], components: [row] }).catch(() => {});

    } catch (error) {
      logger.error(`Falha ao notificar membro inativo ${level.userId}:`, error);
    }
  }
}
