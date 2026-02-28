interface AIMessage {
    role: 'user' | 'model';
    parts: {
        text: string;
    }[];
}
export declare class AIService {
    private currentKey;
    private genAI;
    private model;
    constructor();
    private ensureModelInitialized;
    private buildSystemPrompt;
    sanitizeInput(input: string): string;
    detectPromptInjection(input: string): {
        isInjection: boolean;
        reason?: string;
    };
    private recordInjectionAttempt;
    checkRateLimit(userId: string): Promise<{
        allowed: boolean;
        resetIn?: number;
    }>;
    getShortTermMemory(userId: string): Promise<AIMessage[]>;
    saveShortTermMemory(userId: string, messages: AIMessage[]): Promise<void>;
    getMediumTermMemory(userId: string): Promise<string | null>;
    saveMediumTermMemory(userId: string, summary: string): Promise<void>;
    getLongTermMemory(userId: string): Promise<any>;
    saveLongTermMemory(userId: string, data: any): Promise<void>;
    getUserProfile(userId: string): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        interests: string[];
        personality: string | null;
        commonQuestions: string[];
        preferredStyle: string | null;
        totalInteractions: number;
        lastInteraction: Date | null;
        behaviorPatterns: import("@prisma/client/runtime/library").JsonValue | null;
        topicsOfInterest: import("@prisma/client/runtime/library").JsonValue | null;
        stars: number;
        lastFeaturedAt: Date | null;
    } | null>;
    updateUserProfile(userId: string, updates: any): Promise<void>;
    private detectInterests;
    private getFunctionDeclarations;
    private executeFunctionCall;
    private querySystemKnowledge;
    private getUserEconomy;
    private getUserLevel;
    private getUserInventory;
    private searchShopItems;
    private getServerEvents;
    private getLeaderboard;
    processMessage(userId: string, username: string, message: string, retryCount?: number): Promise<string>;
    private loadUserContext;
    private buildConversationHistory;
    private saveInteraction;
    private saveConversationHistory;
    private recordMetrics;
    private recordError;
}
export {};
