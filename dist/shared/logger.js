import winston from 'winston';
import { appConfig } from './config.js';
/**
 * Logger configurado para a aplicação
 *
 * Níveis disponíveis:
 * - error: Erros críticos
 * - warn: Avisos
 * - info: Informações gerais (padrão)
 * - debug: Informações de debug
 */
export const logger = winston.createLogger({
    level: appConfig.logging.level,
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })),
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    }));
}
else {
    logger.add(new winston.transports.Console({
        level: 'warn',
        format: winston.format.simple()
    }));
}
import * as fs from 'fs';
import * as path from 'path';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
//# sourceMappingURL=logger.js.map