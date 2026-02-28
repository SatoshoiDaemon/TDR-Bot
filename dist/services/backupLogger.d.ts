export interface BackupLog {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    backup?: number;
    duration?: string;
}
export declare class BackupLogger {
    private logs;
    private webhookUrl;
    private startTime;
    private backupCount;
    constructor(webhookUrl?: string);
    /**
     * Iniciar nova sessão de logs
     */
    start(backupCount: number): void;
    /**
     * Adicionar log à fila
     */
    log(level: 'info' | 'warn' | 'error' | 'success', message: string, backup?: number): void;
    /**
     * Enviar logs coletados via webhook
     */
    sendToWebhook(): Promise<boolean>;
    /**
     * Criar embeds para os logs
     */
    private createEmbeds;
    /**
     * Obter prefixo para console
     */
    private getPrefix;
    /**
     * Obter ícone para embed
     */
    private getIcon;
    /**
     * Obter todos os logs
     */
    getLogs(): BackupLog[];
    /**
     * Obter logs por nível
     */
    getLogsByLevel(level: 'info' | 'warn' | 'error' | 'success'): BackupLog[];
    /**
     * Limpar logs
     */
    clear(): void;
    /**
     * Checar se tem erros
     */
    hasErrors(): boolean;
    /**
     * Checar se tem warnings
     */
    hasWarnings(): boolean;
}
