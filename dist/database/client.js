import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../shared/logger.js';
import { SnapshotDatabase } from './database.js';
import { appConfig } from '../shared/config.js';
// Caminho absoluto do banco de snapshots (funciona em produção/hospedagem)
const resolvedDbPath = path.resolve(process.cwd(), appConfig.database.path);
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
// Singleton para o Prisma Client
export const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
    ],
});
prisma.$on('query', (e) => {
    if (process.env.LOG_LEVEL === 'debug') {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
    }
});
/** SnapshotDatabase (sql.js) para snapshots locais e backup */
export const snapshotDb = new SnapshotDatabase(resolvedDbPath);
/** Caminho absoluto do banco (para BackupService e outros) */
export const databasePath = resolvedDbPath;
export async function connectDB() {
    try {
        await prisma.$connect();
        logger.info('PostgreSQL conectado (Prisma)');
        await snapshotDb.ensureInitialized();
        logger.info('SnapshotDatabase (sql.js) inicializado');
    }
    catch (error) {
        logger.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=client.js.map