import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, PermissionFlagsBits ,
    MessageFlags
} from 'discord.js';
import { Command } from '../types.js';
import { prisma } from '@database/client.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

export const aiKeysCommand: Command = {
  name: 'ai-keys',
  description: 'Gerencia o pool de chaves API da IA',
  data: new SlashCommandBuilder()
    .setName('ai-keys')
    .setDescription('Gerencia o pool de chaves API da IA')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista todas as chaves no pool')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Adiciona uma nova chave ao pool')
        .addStringOption(opt => opt.setName('key').setDescription('A chave API do Gemini').setRequired(true))
        .addStringOption(opt => opt.setName('label').setDescription('Nome amigável para a chave'))
        .addIntegerOption(opt => opt.setName('limit').setDescription('Limite diário de tokens (padrão: 1M)'))
        .addIntegerOption(opt => opt.setName('priority').setDescription('Prioridade da chave (padrão: 1)'))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove uma chave do pool')
        .addStringOption(opt => opt.setName('id').setDescription('ID da chave').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Altera o status de uma chave')
        .addStringOption(opt => opt.setName('id').setDescription('ID da chave').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('Novo status').setRequired(true)
          .addChoices(
            { name: 'Ativa', value: 'active' },
            { name: 'Desativada', value: 'disabled' }
          ))
    ),

  async execute(interactionOrMessage, client, database) {
    if (interactionOrMessage instanceof Message) {
      await interactionOrMessage.reply('Este comando só está disponível via Slash Command.');
      return;
    }

    const interaction = interactionOrMessage as ChatInputCommandInteraction;
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'list':
          await this.handleList(interaction);
          break;
        case 'add':
          await this.handleAdd(interaction);
          break;
        case 'remove':
          await this.handleRemove(interaction);
          break;
        case 'status':
          await this.handleStatus(interaction);
          break;
      }
    } catch (error) {
      logger.error('Erro no comando ai-keys:', error);
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar o comando.', flags: MessageFlags.Ephemeral });
    }
  },

  async handleList(interaction: ChatInputCommandInteraction) {
    const keys = await prisma.aPIKey.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (keys.length === 0) {
      await interaction.reply({ content: 'Nenhuma chave cadastrada no pool.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔑 Pool de Chaves API - IA')
      .setColor(EMBED_COLORS.PRIMARY)
      .setFooter({ text: EMBED_CREDIT });

    const description = keys.map((k: any) => {
      const statusEmoji = k.status === 'active' ? '✅' : k.status === 'rate_limited' ? '⏳' : '❌';
      const maskedKey = `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}`;
      return `**ID:** \`${k.id.substring(0, 8)}\` | ${statusEmoji} **${k.label || 'Sem nome'}**\n` +
        `Key: \`${maskedKey}\` | Prioridade: \`${k.priority}\`\n` +
        `Uso: \`${k.usedTokensToday.toLocaleString()}/${k.dailyTokenLimit.toLocaleString()}\` tokens\n`;
    }).join('\n');

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },

  async handleAdd(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);
    const label = interaction.options.getString('label');
    const limit = interaction.options.getInteger('limit') || 1000000;
    const priority = interaction.options.getInteger('priority') || 1;

    try {
      const newKey = await prisma.aPIKey.create({
        data: {
          key,
          label,
          dailyTokenLimit: limit,
          priority
        }
      });

      await interaction.reply({
        content: `✅ Chave adicionada com sucesso!\n**ID:** \`${newKey.id}\`\n**Label:** ${label || 'N/A'}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        await interaction.reply({ content: '❌ Esta chave já está cadastrada no pool.', flags: MessageFlags.Ephemeral });
      } else {
        throw error;
      }
    }
  },

  async handleRemove(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString('id', true);

    try {
      await prisma.aPIKey.delete({ where: { id } });
      await interaction.reply({ content: `✅ Chave \`${id}\` removida do pool.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      await interaction.reply({ content: '❌ Chave não encontrada.', flags: MessageFlags.Ephemeral });
    }
  },

  async handleStatus(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getString('id', true);
    const status = interaction.options.getString('status', true);

    try {
      await prisma.aPIKey.update({
        where: { id },
        data: { status }
      });
      await interaction.reply({ content: `✅ Status da chave \`${id}\` alterado para \`${status}\`.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      await interaction.reply({ content: '❌ Chave não encontrada.', flags: MessageFlags.Ephemeral });
    }
  }
};
