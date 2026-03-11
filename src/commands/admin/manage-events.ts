import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember ,
    MessageFlags
} from 'discord.js';
import { prisma } from '@database/client.js';
import { PermissionUtils } from '@shared/utils/permissionUtils.js';
import { logger } from '@shared/logger.js';

export const manageEventsCommand = {
  name: 'manage-events',
  description: 'Gerencia os pontos de evento dos membros',
  data: new SlashCommandBuilder()
    .setName('manage-events')
    .setDescription('Gerencia os pontos de evento dos membros')
    .addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('Quantidade de pontos').setRequired(true))
    .addStringOption(o => o.setName('action').setDescription('Ação').setRequired(true).addChoices(
      { name: 'Adicionar', value: 'add' },
      { name: 'Remover', value: 'remove' },
      { name: 'Definir', value: 'set' }
    )),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!PermissionUtils.isStaff(interaction.member as any)) {
      return interaction.reply({ content: '❌ Permissão negada.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser('user', true);
    const points = interaction.options.getInteger('points', true);
    const action = interaction.options.getString('action', true);

    try {
      let updateData = {};
      if (action === 'add') updateData = { eventPoints: { increment: points } };
      else if (action === 'remove') updateData = { eventPoints: { decrement: points } };
      else updateData = { eventPoints: points };

      await prisma.level.upsert({
        where: { userId: target.id },
        update: updateData,
        create: { userId: target.id, eventPoints: action === 'set' ? points : (action === 'add' ? points : 0) }
      });

      await interaction.reply({ content: `✅ Pontos de evento de **${target.username}** atualizados com sucesso!`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error('Erro ao gerenciar pontos de evento:', error);
      await interaction.reply({ content: '❌ Erro ao atualizar pontos.', flags: MessageFlags.Ephemeral });
    }
  }
};
