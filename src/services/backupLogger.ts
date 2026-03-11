import axios from 'axios';
import { EmbedBuilder } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export interface BackupLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  backup?: number;
  duration?: string;
}

export class BackupLogger {
  private logs: BackupLog[] = [];
  private webhookUrl: string;
  private startTime: number = 0;
  private backupCount: number = 0;

  constructor(webhookUrl: string = '') {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Iniciar nova sessão de logs
   */
  start(backupCount: number): void {
    this.logs = [];
    this.startTime = Date.now();
    this.backupCount = backupCount;
    this.log('info', `Iniciando ciclo de backup (${backupCount} destino(s))`);
  }

  /**
   * Adicionar log à fila
   */
  log(level: 'info' | 'warn' | 'error' | 'success', message: string, backup?: number): void {
    this.logs.push({
      timestamp: Date.now(),
      level,
      message,
      backup
    });

    // Também logar no console
    const prefix = this.getPrefix(level);
    console.log(`${prefix} ${message}`);
  }

  /**
   * Enviar logs coletados via webhook
   */
  async sendToWebhook(): Promise<boolean> {
    if (!this.webhookUrl) {
      console.log('Webhook não configurado. Logs não enviados.');
      return false;
    }

    try {
      const duration = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
      const embeds = this.createEmbeds(duration);

      await axios.post(this.webhookUrl, {
        embeds: embeds.map(e => e.toJSON()),
        username: 'ArgosBot — Log',
        avatar_url: 'https://media.discordapp.net/attachments/1459746056102215784/1462330628036104396/f8b410ba91582fcefa4dd4af62622d00.jpg?ex=697f9946&is=697e47c6&hm=6426693a05b9e75cf0dc906608dd1f7ebf238a4ad366e4842249f48138f1f1cc&=&format=webp'
      });

      console.log('Logs de backup enviados ao webhook.');
      return true;
    } catch (error) {
      console.error('Erro ao enviar logs ao webhook:', error);
      return false;
    }
  }

  /**
   * Criar embeds para os logs
   */
  private createEmbeds(duration: string): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];

    const summaryEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle('Resumo do Backup')
      .setFooter({ text: EMBED_CREDIT })
      .setTimestamp()
      .addFields(
        { name: 'Duração', value: `${duration} min`, inline: true },
        { name: 'Backups', value: String(this.backupCount), inline: true },
        { name: 'Logs', value: String(this.logs.length), inline: true }
      );

    embeds.push(summaryEmbed);

    // Embed com detalhes dos logs (máximo 25 campos por embed)
    const logsByBackup = new Map<number | undefined, BackupLog[]>();
    for (const log of this.logs) {
      const key = log.backup;
      if (!logsByBackup.has(key)) {
        logsByBackup.set(key, []);
      }
      logsByBackup.get(key)!.push(log);
    }

    let currentEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SECONDARY)
      .setTitle('Detalhes do Backup');

    let fieldCount = 0;

    for (const [backup, backupLogs] of logsByBackup) {
      const backupLabel = backup ? `Backup ${backup}` : 'Geral';
      const icon = this.getIcon('info');

      // Agrupar logs por tipo
      const errorLogs = backupLogs.filter(l => l.level === 'error');
      const warningLogs = backupLogs.filter(l => l.level === 'warn');
      const successLogs = backupLogs.filter(l => l.level === 'success');
      const infoLogs = backupLogs.filter(l => l.level === 'info');

      const summary = [];
      if (successLogs.length > 0) summary.push(`Sucesso: ${successLogs.length}`);
      if (infoLogs.length > 0) summary.push(`Info: ${infoLogs.length}`);
      if (warningLogs.length > 0) summary.push(`Aviso: ${warningLogs.length}`);
      if (errorLogs.length > 0) summary.push(`Erro: ${errorLogs.length}`);

      const fieldValue = summary.length > 0 ? summary.join(' · ') : 'Nenhum log';

      if (fieldCount < 25) {
        currentEmbed.addFields({
          name: backupLabel,
          value: fieldValue,
          inline: false
        });
        fieldCount++;
      } else {
        // Se atingiu limite, criar novo embed
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SECONDARY)
          .setTitle('Detalhes (continuação)');
        currentEmbed.addFields({
          name: backupLabel,
          value: fieldValue,
          inline: false
        });
        fieldCount = 1;
      }
    }

    if (fieldCount > 0) {
      embeds.push(currentEmbed);
    }

    // Embed com status final
    const hasErrors = this.logs.some(l => l.level === 'error');
    const statusEmbed = new EmbedBuilder()
      .setColor(hasErrors ? EMBED_COLORS.ERROR : EMBED_COLORS.SUCCESS)
      .setTitle(hasErrors ? 'Backup concluído com erros' : 'Backup concluído')
      .setDescription(hasErrors ? 'Alguns backups podem ter falhado. Verifique os detalhes.' : 'Todos os backups concluídos.')
      .setFooter({ text: `${EMBED_CREDIT} · ${new Date().toLocaleString('pt-BR')}` });

    embeds.push(statusEmbed);

    return embeds;
  }

  /**
   * Obter prefixo para console
   */
  private getPrefix(level: 'info' | 'warn' | 'error' | 'success'): string {
    const prefixes: Record<string, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    return prefixes[level] || '•';
  }

  /**
   * Obter ícone para embed
   */
  private getIcon(level: 'info' | 'warn' | 'error' | 'success'): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    return icons[level] || '•';
  }

  /**
   * Obter todos os logs
   */
  getLogs(): BackupLog[] {
    return [...this.logs];
  }

  /**
   * Obter logs por nível
   */
  getLogsByLevel(level: 'info' | 'warn' | 'error' | 'success'): BackupLog[] {
    return this.logs.filter(l => l.level === level);
  }

  /**
   * Limpar logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Checar se tem erros
   */
  hasErrors(): boolean {
    return this.logs.some(l => l.level === 'error');
  }

  /**
   * Checar se tem warnings
   */
  hasWarnings(): boolean {
    return this.logs.some(l => l.level === 'warn');
  }
}
