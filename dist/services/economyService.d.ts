/** Garante que o User existe no banco (FK de Economy e Transaction). */
export declare function ensureUser(userId: string, username?: string): Promise<void>;
export declare class EconomyService {
    static getBalance(userId: string, username?: string): Promise<{
        userId: string;
        wallet: bigint;
        bank: bigint;
        lastDaily: Date | null;
    }>;
    static addMoney(userId: string, amount: number, type?: 'wallet' | 'bank', username?: string): Promise<{
        userId: string;
        wallet: bigint;
        bank: bigint;
        lastDaily: Date | null;
    }>;
    static transfer(fromId: string, toId: string, amount: number, fromUsername?: string, toUsername?: string): Promise<void>;
    static daily(userId: string, guildId?: string): Promise<{
        success: boolean;
        remaining: number;
        reason: string;
        current?: undefined;
        required?: undefined;
        money?: undefined;
        xp?: undefined;
    } | {
        success: boolean;
        reason: string;
        current: number;
        required: any;
        remaining?: undefined;
        money?: undefined;
        xp?: undefined;
    } | {
        success: boolean;
        money: number;
        xp: number;
        remaining?: undefined;
        reason?: undefined;
        current?: undefined;
        required?: undefined;
    }>;
    static collect(userId: string, memberRoles: string[], username?: string): Promise<{
        success: boolean;
        error: string;
        amount?: undefined;
        count?: undefined;
    } | {
        success: boolean;
        amount: number;
        count: number;
        error?: undefined;
    }>;
    static deposit(userId: string, amount: number | 'all', username?: string): Promise<{
        success: boolean;
        amount: number;
        newBalance: number;
    }>;
    static withdraw(userId: string, amount: number | 'all', username?: string): Promise<{
        success: boolean;
        amount: number;
        newBalance: number;
    }>;
}
