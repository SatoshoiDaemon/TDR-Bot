import { SnapshotData, MessageSnapshot, ForumThreadSnapshot, EmbedArchive } from '../types/types.js';
export declare class SnapshotDatabase {
    private db;
    private dbPath;
    private initPromise;
    constructor(dbPath?: string);
    private init;
    /**
     * Garante que o banco de dados foi inicializado
     * Deve ser chamado antes de usar o database em código síncrono
     */
    ensureInitialized(): Promise<void>;
    private ensureDb;
    private save;
    private escape;
    private initTables;
    saveGuildSnapshot(snapshot: SnapshotData, type?: string): Promise<void>;
    saveCategorySnapshot(timestamp: number, guildId: string, categoryId: string, categoryName: string, data: any): Promise<void>;
    saveMessage(message: MessageSnapshot): Promise<void>;
    saveForumThread(thread: ForumThreadSnapshot): Promise<void>;
    getLatestSnapshot(guildId: string, type?: string): Promise<SnapshotData | null>;
    getSnapshotHistory(guildId: string, limit?: number): Promise<SnapshotData[]>;
    isMessageMirrored(messageId: string): Promise<boolean>;
    isThreadMirrored(threadId: string): Promise<boolean>;
    updateMirrorSyncState(sourceGuildId: string, targetGuildId: string, categoryId: string, messageCount?: number, threadCount?: number): Promise<void>;
    getMirrorSyncState(sourceGuildId: string, targetGuildId: string, categoryId: string): Promise<any>;
    saveTextChannelThread(thread: {
        id: string;
        channelId: string;
        originalChannelId: string;
        name: string;
        archived: boolean;
        locked: boolean;
        createdTimestamp: number;
    }): Promise<void>;
    isTextChannelThreadMirrored(threadId: string): Promise<boolean>;
    saveEmbedArchive(archive: EmbedArchive): Promise<void>;
    getEmbedArchive(messageId: string): Promise<EmbedArchive | null>;
    getEmbedArchivesByChannel(channelId: string, limit?: number): Promise<EmbedArchive[]>;
    close(): void;
}
export declare const snapshotDb: SnapshotDatabase;
