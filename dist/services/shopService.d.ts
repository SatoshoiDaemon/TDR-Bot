import { Prisma } from '@prisma/client';
import { GuildMember } from 'discord.js';
export interface ItemRequirements {
    roles?: string[];
    minLevel?: number;
    minServerTime?: number;
}
export interface ItemActions {
    message?: string;
    addRoles?: string[];
    removeRoles?: string[];
    tempRoles?: {
        roleId: string;
        duration: number;
    }[];
    addMoney?: number;
    addXp?: number;
    badge?: {
        name: string;
        icon: string;
    };
}
export declare class ShopService {
    static buyItem(userId: string, itemId: string, member: GuildMember): Promise<{
        createdAt: Date;
        id: string;
        icon: string | null;
        name: string;
        description: string;
        price: number;
        stock: number | null;
        isUsable: boolean;
        isCollectible: boolean;
        requirements: Prisma.JsonValue | null;
        actions: Prisma.JsonValue | null;
    }>;
    static useItem(userId: string, itemId: string, member: GuildMember): Promise<{
        item: {
            createdAt: Date;
            id: string;
            icon: string | null;
            name: string;
            description: string;
            price: number;
            stock: number | null;
            isUsable: boolean;
            isCollectible: boolean;
            requirements: Prisma.JsonValue | null;
            actions: Prisma.JsonValue | null;
        };
        actions: ItemActions;
    }>;
    static executeActions(tx: Prisma.TransactionClient, userId: string, actions: ItemActions, member: GuildMember): Promise<void>;
}
