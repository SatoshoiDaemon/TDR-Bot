/**
 * Converte strings de tempo humano (1d, 12h, 30m, 10s) para milissegundos
 */
export declare function parseHumanTime(timeStr: string): number;
/**
 * Converte milissegundos para uma string legível
 */
export declare function formatDuration(ms: number): string;
