import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
/**
 * Comando Daily - Recompensa diária
 *
 * Funcionalidades:
 * - Recompensa de dracmas e XP a cada 24h
 * - Sistema de cooldown
 * - Verificação de atividade (mensagens)
 * - Histórico de coletas
 */
export declare const dailyCommand: {
    name: string;
    description: string;
    data: SlashCommandBuilder;
    execute(interactionOrMessage: ChatInputCommandInteraction | Message): Promise<void>;
};
