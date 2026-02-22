import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, Message } from 'discord.js';
import { Client } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  data?: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction | Message, client: Client, database?: unknown, args?: string[]) => Promise<void>;
  [key: string]: any;
}
