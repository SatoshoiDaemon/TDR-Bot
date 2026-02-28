import { GuildMember } from 'discord.js';
export declare class LevelService {
    /**
     * Verifica se a mensagem é spam (caracteres repetidos ou muito curta)
     */
    private static isSpamMessage;
    static addExperience(member: GuildMember, channelId: string, messageContent?: string): Promise<{
        leveledUp: boolean;
        newLevel: number;
        rewards: string[];
    } | {
        leveledUp: boolean;
        newLevel?: undefined;
        rewards?: undefined;
    } | null>;
    static checkLevelRewards(member: GuildMember, level: number): Promise<string[]>;
    static calculateXpForLevel(level: number): number;
    static getRank(userId: string): Promise<any>;
    /**
     * Limpa todos os caches de rank (útil quando a fórmula muda)
     */
    static flushRankCache(): Promise<void>;
}
