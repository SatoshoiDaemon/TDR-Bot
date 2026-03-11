/**
 * Configuração centralizada da aplicação
 */
export declare const appConfig: {
    readonly discord: {
        readonly token: string;
        readonly guildId: string;
        readonly backupGuildIds: string[];
        readonly systemCategory: string;
        readonly snapshotHour: number;
    };
    readonly database: {
        readonly path: string;
    };
    readonly backup: {
        readonly retentionDays: number;
        readonly intervalHours: number;
        readonly webhookUrl: string;
    };
    readonly logging: {
        readonly level: "error" | "warn" | "info" | "debug";
    };
    readonly commands: {
        readonly prefix: string;
    };
    readonly loritta: {
        readonly token: string;
    };
};
