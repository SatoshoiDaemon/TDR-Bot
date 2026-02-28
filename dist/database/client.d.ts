import { PrismaClient } from '@prisma/client';
import { SnapshotDatabase } from './database.js';
export declare const prisma: PrismaClient<{
    log: ({
        level: "query";
        emit: "event";
    } | {
        level: "info";
        emit: "stdout";
    } | {
        level: "warn";
        emit: "stdout";
    } | {
        level: "error";
        emit: "stdout";
    })[];
}, "query", import("@prisma/client/runtime/library").DefaultArgs>;
/** SnapshotDatabase (sql.js) para snapshots locais e backup */
export declare const snapshotDb: SnapshotDatabase;
/** Caminho absoluto do banco (para BackupService e outros) */
export declare const databasePath: string;
export declare function connectDB(): Promise<void>;
