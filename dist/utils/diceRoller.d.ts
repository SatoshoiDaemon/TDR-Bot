import { Message } from 'discord.js';
export declare class DiceRoller {
    private static readonly DICE_REGEX;
    private static readonly MAX_DICE;
    private static readonly MAX_SIDES;
    private static readonly IGNORE_PATTERNS;
    static handleMessage(message: Message): boolean;
}
