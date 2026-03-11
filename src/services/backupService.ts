import * as fs from 'fs';
import * as path from 'path';

export class BackupService {
  private backupDir: string;
  private retentionDays: number;

  constructor(dbPath: string = './snapshots.db', retentionDays: number = 30) {
    const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    this.backupDir = path.join(path.dirname(resolvedDbPath), 'backups');
    this.retentionDays = retentionDays;

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Cria backup do banco de dados
   */
  createBackup(dbPath: string): string {
    const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `snapshots-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      if (!fs.existsSync(resolvedDbPath)) {
        console.error(`Erro ao criar backup: Arquivo fonte não existe: ${resolvedDbPath}`);
        return '';
      }
      fs.copyFileSync(resolvedDbPath, backupPath);
      console.log(`Backup criado: ${backupName}`);
      return backupPath;
    } catch (error) {
      console.error(`Erro ao criar backup: ${error}`);
      return '';
    }
  }

  /**
   * Remove backups antigos conforme política de retenção
   */
  cleanOldBackups(): void {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();

      files.forEach(file => {
        if (!file.startsWith('snapshots-')) return;

        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > this.retentionDays) {
          fs.unlinkSync(filePath);
          console.log(`Backup antigo removido: ${file} (${Math.floor(ageInDays)} dias)`);
        }
      });
    } catch (error) {
      console.error(`Erro ao limpar backups antigos: ${error}`);
    }
  }

  /**
   * Lista backups disponíveis
   */
  listBackups(): Array<{ name: string; date: Date; size: number }> {
    try {
      const files = fs.readdirSync(this.backupDir);

      return files
        .filter(f => f.startsWith('snapshots-') && f.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          const dateStr = file.replace('snapshots-', '').replace('.db', '');
          const date = new Date(dateStr.replace(/-(\d{2})-(\d{2})$/, 'T$1:$2'));

          return {
            name: file,
            date,
            size: stats.size
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error(`Erro ao listar backups: ${error}`);
      return [];
    }
  }

  /**
   * Retorna caminho do backup (não sobrescreve)
   */
  getBackupPath(backupName: string): string {
    const backupPath = path.join(this.backupDir, backupName);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup não encontrado: ${backupName}`);
    }

    return backupPath;
  }

  /**
   * Retorna informações de tamanho do banco
   */
  getDatabaseStats(dbPath: string): { size: number; backups: number; oldestBackup: Date | null } {
    const stats = fs.statSync(dbPath);
    const backups = this.listBackups();

    return {
      size: stats.size,
      backups: backups.length,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].date : null
    };
  }
}
