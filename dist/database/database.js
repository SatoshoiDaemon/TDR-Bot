import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
export class SnapshotDatabase {
    db = null;
    dbPath;
    initPromise;
    constructor(dbPath = './snapshots.db') {
        this.dbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.initPromise = this.init();
    }
    async init() {
        try {
            const SQL = await initSqlJs();
            // Carregar banco de dados existente ou criar novo
            if (fs.existsSync(this.dbPath)) {
                const buffer = fs.readFileSync(this.dbPath);
                this.db = new SQL.Database(buffer);
            }
            else {
                this.db = new SQL.Database();
            }
            this.initTables();
            this.save(); // Salvar após criar tabelas
        }
        catch (error) {
            console.error('Erro ao inicializar banco de dados:', error);
            throw error;
        }
    }
    /**
     * Garante que o banco de dados foi inicializado
     * Deve ser chamado antes de usar o database em código síncrono
     */
    async ensureInitialized() {
        await this.initPromise;
        if (!this.db) {
            throw new Error('Banco de dados não inicializado');
        }
    }
    ensureDb() {
        if (!this.db) {
            throw new Error('Banco de dados não inicializado. Aguarde a inicialização assíncrona.');
        }
        return this.db;
    }
    save() {
        if (!this.db)
            return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        }
        catch (error) {
            console.error('Erro ao salvar banco de dados:', error);
        }
    }
    escape(value) {
        if (value === null || value === undefined) {
            return 'NULL';
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        // Escapar strings
        return "'" + String(value).replace(/'/g, "''") + "'";
    }
    initTables() {
        const db = this.ensureDb();
        db.run(`
      CREATE TABLE IF NOT EXISTS guild_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        guild_id TEXT NOT NULL,
        guild_name TEXT NOT NULL,
        data TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'full',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS category_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        guild_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mirrored_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        original_channel_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_tag TEXT NOT NULL,
        content TEXT,
        timestamp INTEGER NOT NULL,
        embeds TEXT,
        attachments TEXT,
        reactions TEXT,
        mirrored_message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS forum_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        original_channel_id TEXT NOT NULL,
        name TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0,
        created_timestamp INTEGER NOT NULL,
        mirrored_thread_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS text_channel_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        original_channel_id TEXT NOT NULL,
        name TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        locked INTEGER NOT NULL DEFAULT 0,
        created_timestamp INTEGER NOT NULL,
        mirrored_thread_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS embed_archives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        author_tag TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        embeds_data TEXT NOT NULL,
        archived_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mirror_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_guild_id TEXT NOT NULL,
        target_guild_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        last_sync_timestamp INTEGER,
        message_count INTEGER DEFAULT 0,
        thread_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_guild_id, target_guild_id, category_id)
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON guild_snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_snapshots_guild ON guild_snapshots(guild_id);
      CREATE INDEX IF NOT EXISTS idx_category_snapshots_timestamp ON category_snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_channel ON mirrored_messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_messages_original_id ON mirrored_messages(message_id);
      CREATE INDEX IF NOT EXISTS idx_embed_archives_message ON embed_archives(message_id);
      CREATE INDEX IF NOT EXISTS idx_embed_archives_channel ON embed_archives(channel_id);
      CREATE INDEX IF NOT EXISTS idx_threads_channel ON forum_threads(channel_id);
      CREATE INDEX IF NOT EXISTS idx_threads_original_id ON forum_threads(thread_id);
      CREATE INDEX IF NOT EXISTS idx_text_threads_channel ON text_channel_threads(channel_id);
      CREATE INDEX IF NOT EXISTS idx_text_threads_original_id ON text_channel_threads(thread_id);
    `);
    }
    async saveGuildSnapshot(snapshot, type = 'full') {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const data = JSON.stringify(snapshot);
        db.run(`INSERT INTO guild_snapshots (timestamp, guild_id, guild_name, data, type)
       VALUES (${this.escape(snapshot.timestamp)}, ${this.escape(snapshot.guildId)}, ${this.escape(snapshot.guildName)}, ${this.escape(data)}, ${this.escape(type)})`);
        this.save();
    }
    async saveCategorySnapshot(timestamp, guildId, categoryId, categoryName, data) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const dataStr = JSON.stringify(data);
        db.run(`INSERT INTO category_snapshots (timestamp, guild_id, category_id, category_name, data)
       VALUES (${this.escape(timestamp)}, ${this.escape(guildId)}, ${this.escape(categoryId)}, ${this.escape(categoryName)}, ${this.escape(dataStr)})`);
        this.save();
    }
    async saveMessage(message) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        db.run(`INSERT OR IGNORE INTO mirrored_messages
       (message_id, channel_id, original_channel_id, author_id, author_tag,
        content, timestamp, embeds, attachments, reactions)
       VALUES (${this.escape(message.id)}, ${this.escape(message.channelId)}, ${this.escape(message.channelId)}, ${this.escape(message.authorId)}, ${this.escape(message.authorTag)}, ${this.escape(message.content)}, ${this.escape(message.timestamp)}, ${this.escape(message.embeds)}, ${this.escape(message.attachments)}, ${this.escape(message.reactions)})`);
        this.save();
    }
    async saveForumThread(thread) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        db.run(`INSERT OR IGNORE INTO forum_threads
       (thread_id, channel_id, original_channel_id, name, archived, locked, created_timestamp)
       VALUES (${this.escape(thread.id)}, ${this.escape(thread.channelId)}, ${this.escape(thread.channelId)}, ${this.escape(thread.name)}, ${this.escape(thread.archived ? 1 : 0)}, ${this.escape(thread.locked ? 1 : 0)}, ${this.escape(thread.createdTimestamp)})`);
        this.save();
        for (const msg of thread.messages) {
            await this.saveMessage(msg);
        }
    }
    async getLatestSnapshot(guildId, type = 'full') {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT data FROM guild_snapshots
       WHERE guild_id = ${this.escape(guildId)} AND type = ${this.escape(type)}
       ORDER BY timestamp DESC
       LIMIT 1`);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        const data = result[0].values[0][0];
        return JSON.parse(data);
    }
    async getSnapshotHistory(guildId, limit = 30) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT data FROM guild_snapshots
       WHERE guild_id = ${this.escape(guildId)}
       ORDER BY timestamp DESC
       LIMIT ${this.escape(limit)}`);
        if (result.length === 0) {
            return [];
        }
        return result[0].values.map((row) => JSON.parse(row[0]));
    }
    async isMessageMirrored(messageId) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT id FROM mirrored_messages WHERE message_id = ${this.escape(messageId)} LIMIT 1`);
        return result.length > 0 && result[0].values.length > 0;
    }
    async isThreadMirrored(threadId) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT id FROM forum_threads WHERE thread_id = ${this.escape(threadId)} LIMIT 1`);
        return result.length > 0 && result[0].values.length > 0;
    }
    async updateMirrorSyncState(sourceGuildId, targetGuildId, categoryId, messageCount = 0, threadCount = 0) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const now = Date.now();
        // sql.js não suporta ON CONFLICT diretamente, então usamos uma abordagem diferente
        const existing = db.exec(`SELECT id FROM mirror_sync_state 
       WHERE source_guild_id = ${this.escape(sourceGuildId)} AND target_guild_id = ${this.escape(targetGuildId)} AND category_id = ${this.escape(categoryId)}`);
        if (existing.length > 0 && existing[0].values.length > 0) {
            // Update
            db.run(`UPDATE mirror_sync_state 
         SET last_sync_timestamp = ${this.escape(now)}, message_count = ${this.escape(messageCount)}, thread_count = ${this.escape(threadCount)}, updated_at = CURRENT_TIMESTAMP
         WHERE source_guild_id = ${this.escape(sourceGuildId)} AND target_guild_id = ${this.escape(targetGuildId)} AND category_id = ${this.escape(categoryId)}`);
        }
        else {
            // Insert
            db.run(`INSERT INTO mirror_sync_state 
         (source_guild_id, target_guild_id, category_id, last_sync_timestamp, message_count, thread_count)
         VALUES (${this.escape(sourceGuildId)}, ${this.escape(targetGuildId)}, ${this.escape(categoryId)}, ${this.escape(now)}, ${this.escape(messageCount)}, ${this.escape(threadCount)})`);
        }
        this.save();
    }
    async getMirrorSyncState(sourceGuildId, targetGuildId, categoryId) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT * FROM mirror_sync_state 
       WHERE source_guild_id = ${this.escape(sourceGuildId)} AND target_guild_id = ${this.escape(targetGuildId)} AND category_id = ${this.escape(categoryId)}`);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        const columns = result[0].columns;
        const values = result[0].values[0];
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col] = values[idx];
        });
        return obj;
    }
    async saveTextChannelThread(thread) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        db.run(`INSERT OR IGNORE INTO text_channel_threads
       (thread_id, channel_id, original_channel_id, name, archived, locked, created_timestamp)
       VALUES (${this.escape(thread.id)}, ${this.escape(thread.channelId)}, ${this.escape(thread.originalChannelId)}, ${this.escape(thread.name)}, ${this.escape(thread.archived ? 1 : 0)}, ${this.escape(thread.locked ? 1 : 0)}, ${this.escape(thread.createdTimestamp)})`);
        this.save();
    }
    async isTextChannelThreadMirrored(threadId) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT id FROM text_channel_threads WHERE thread_id = ${this.escape(threadId)} LIMIT 1`);
        return result.length > 0 && result[0].values.length > 0;
    }
    async saveEmbedArchive(archive) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const embedsData = JSON.stringify(archive.embeds);
        db.run(`INSERT OR REPLACE INTO embed_archives
       (message_id, channel_id, author_tag, timestamp, embeds_data, archived_at)
       VALUES (${this.escape(archive.messageId)}, ${this.escape(archive.channelId)}, ${this.escape(archive.authorTag)}, ${this.escape(archive.timestamp)}, ${this.escape(embedsData)}, ${this.escape(archive.archivedAt)})`);
        this.save();
    }
    async getEmbedArchive(messageId) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT message_id, channel_id, author_tag, timestamp, embeds_data, archived_at FROM embed_archives WHERE message_id = ${this.escape(messageId)} LIMIT 1`);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        const row = result[0].values[0];
        const embedsData = row[4];
        return {
            messageId: row[0],
            channelId: row[1],
            authorTag: row[2],
            timestamp: row[3],
            embeds: JSON.parse(embedsData),
            archivedAt: row[5]
        };
    }
    async getEmbedArchivesByChannel(channelId, limit = 100) {
        await this.ensureInitialized();
        const db = this.ensureDb();
        const result = db.exec(`SELECT message_id, channel_id, author_tag, timestamp, embeds_data, archived_at FROM embed_archives 
       WHERE channel_id = ${this.escape(channelId)}
       ORDER BY archived_at DESC
       LIMIT ${this.escape(limit)}`);
        if (result.length === 0) {
            return [];
        }
        return result[0].values.map((row) => ({
            messageId: row[0],
            channelId: row[1],
            authorTag: row[2],
            timestamp: row[3],
            embeds: JSON.parse(row[4]),
            archivedAt: row[5]
        }));
    }
    close() {
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }
}
export const snapshotDb = new SnapshotDatabase();
//# sourceMappingURL=database.js.map