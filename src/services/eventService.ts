import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export enum EventType {
  MONEY_RAIN = 'money_rain',
  HOT_ZONE = 'hot_zone',
  DOUBLE_XP = 'double_xp',
  SHOP_DEAL = 'shop_deal'
}

export interface ActiveEvent {
  type: EventType;
  endTime: Date;
  data?: any;
}

export class EventService {
  private static activeEvents: Map<string, ActiveEvent> = new Map();
  private static messageCount: number = 0;
  private static config: any;

  static loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/events.yml');
      this.config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      logger.error('Erro ao carregar config de eventos:', error);
      this.config = { enabled: false };
    }
  }

  static isEventActive(type: EventType, channelId?: string): boolean {
    if (!this.config?.enabled) return false;

    // Verificar Double XP Weekend (Fixo)
    if (type === EventType.DOUBLE_XP && this.config.fixed_events.double_xp_weekend.enabled) {
      const now = new Date();
      const day = now.getDay(); // 0 = Domingo, 6 = Sábado
      if (day === 0 || day === 6) return true;
    }

    // Verificar eventos aleatórios ativos
    for (const [key, event] of this.activeEvents) {
      if (event.type === type && event.endTime > new Date()) {
        if (type === EventType.HOT_ZONE && channelId) {
          return event.data?.channelId === channelId;
        }
        return true;
      }
    }

    return false;
  }

  static getActiveEvent(type: EventType): ActiveEvent | undefined {
    return Array.from(this.activeEvents.values()).find(e => e.type === type && e.endTime > new Date());
  }

  static startRandomEvent(type: EventType, durationMinutes: number, data?: any) {
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const eventId = `${type}_${Date.now()}`;
    this.activeEvents.set(eventId, { type, endTime, data });

    // Limpeza automática após o fim
    setTimeout(() => {
      this.activeEvents.delete(eventId);
      logger.info(`Evento ${type} finalizado.`);
    }, durationMinutes * 60 * 1000);

    return eventId;
  }

  static getConfig() {
    if (!this.config) this.loadConfig();
    return this.config;
  }

  static trackMessage() {
    this.messageCount++;
  }

  static getAndResetMessageCount(): number {
    const count = this.messageCount;
    this.messageCount = 0;
    return count;
  }
}
