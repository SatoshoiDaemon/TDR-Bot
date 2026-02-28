import { logger } from '../shared/logger.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export var EventType;
(function (EventType) {
    EventType["MONEY_RAIN"] = "money_rain";
    EventType["HOT_ZONE"] = "hot_zone";
    EventType["DOUBLE_XP"] = "double_xp";
    EventType["SHOP_DEAL"] = "shop_deal";
})(EventType || (EventType = {}));
export class EventService {
    static activeEvents = new Map();
    static messageCount = 0;
    static config;
    static loadConfig() {
        try {
            const configPath = path.join(__dirname, '../../config/events.yml');
            this.config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        }
        catch (error) {
            logger.error('Erro ao carregar config de eventos:', error);
            this.config = { enabled: false };
        }
    }
    static isEventActive(type, channelId) {
        if (!this.config?.enabled)
            return false;
        // Verificar Double XP Weekend (Fixo)
        if (type === EventType.DOUBLE_XP && this.config.fixed_events.double_xp_weekend.enabled) {
            const now = new Date();
            const day = now.getDay(); // 0 = Domingo, 6 = Sábado
            if (day === 0 || day === 6)
                return true;
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
    static getActiveEvent(type) {
        return Array.from(this.activeEvents.values()).find(e => e.type === type && e.endTime > new Date());
    }
    static startRandomEvent(type, durationMinutes, data) {
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
        if (!this.config)
            this.loadConfig();
        return this.config;
    }
    static trackMessage() {
        this.messageCount++;
    }
    static getAndResetMessageCount() {
        const count = this.messageCount;
        this.messageCount = 0;
        return count;
    }
}
//# sourceMappingURL=eventService.js.map