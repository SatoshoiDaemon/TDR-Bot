import { GuildMember } from 'discord.js';
export declare enum QuestType {
    MESSAGES = "MESSAGES",
    VOICE = "VOICE",
    DICE = "DICE",
    GAMES = "GAMES",
    DAILY = "DAILY"
}
/**
 * QuestService - Gerenciamento de missões diárias
 *
 * Funcionalidades:
 * - Geração de missões aleatórias por usuário
 * - Acompanhamento de progresso (mensagens, voz, jogos)
 * - Resgate de recompensas (Dracmas e XP)
 * - Integração com sistema de Leveling
 */
export declare class QuestService {
    /**
     * Verifica se um membro é elegível para missões (possui o cargo necessário)
     */
    static isEligible(member: GuildMember): boolean;
    /**
     * Gera novas missões diárias para um usuário
     */
    static generateDailyQuests(userId: string, guildId: string): Promise<void>;
    /**
     * Incrementa o progresso de uma missão
     */
    static incrementProgress(userId: string, guildId: string, type: QuestType, amount?: number): Promise<void>;
    /**
     * Resgata as recompensas de uma missão completada
     */
    static claimReward(questId: string, member: GuildMember): Promise<{
        money: number;
        xp: number;
        leveledUp: boolean;
        newLevel: any;
        rewards: string[];
    } | null>;
    private static shuffleArray;
}
