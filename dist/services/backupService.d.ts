export declare class BackupService {
    private backupDir;
    private retentionDays;
    constructor(dbPath?: string, retentionDays?: number);
    /**
     * Cria backup do banco de dados
     */
    createBackup(dbPath: string): string;
    /**
     * Remove backups antigos conforme política de retenção
     */
    cleanOldBackups(): void;
    /**
     * Lista backups disponíveis
     */
    listBackups(): Array<{
        name: string;
        date: Date;
        size: number;
    }>;
    /**
     * Retorna caminho do backup (não sobrescreve)
     */
    getBackupPath(backupName: string): string;
    /**
     * Retorna informações de tamanho do banco
     */
    getDatabaseStats(dbPath: string): {
        size: number;
        backups: number;
        oldestBackup: Date | null;
    };
}
