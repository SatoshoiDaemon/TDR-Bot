import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits ,
    MessageFlags
} from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';

export const setupPartnershipCommand = {
  name: 'setup-partnership',
  description: 'Configura o sistema de parcerias do servidor',
  data: new SlashCommandBuilder()
    .setName('setup-partnership')
    .setDescription('Configura o sistema de parcerias do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName('canal_parcerias').setDescription('Canal onde as parcerias são postadas').setRequired(true))
    .addChannelOption(o => o.setName('canal_analise').setDescription('Canal onde a staff analisa os pedidos').setRequired(true))
    .addRoleOption(o => o.setName('cargo_parceiro').setDescription('Cargo dado ao representante da parceria').setRequired(true))
    .addRoleOption(o => o.setName('cargo_ping').setDescription('Cargo que será mencionado nas postagens').setRequired(false))
    .addIntegerOption(o => o.setName('min_membros').setDescription('Quantidade mínima de membros no servidor parceiro').setRequired(false))
    .addIntegerOption(o => o.setName('cooldown').setDescription('Dias mínimos para renovar uma parceria').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const partnershipChannelId = interaction.options.getChannel('canal_parcerias', true).id;
    const analysisChannelId = interaction.options.getChannel('canal_analise', true).id;
    const partnerRoleId = interaction.options.getRole('cargo_parceiro', true).id;
    const pingRoleId = interaction.options.getRole('cargo_ping')?.id;
    const minMembers = interaction.options.getInteger('min_membros');
    const cooldownDays = interaction.options.getInteger('cooldown');

    try {
      const config = {
        partnershipChannelId,
        analysisChannelId,
        partnerRoleId,
        pingRoleId,
        minMembers,
        cooldownDays,
        blacklist: []
      };

      await prisma.systemConfig.upsert({
        where: { key: 'partnership_config' },
        update: { value: JSON.stringify(config) },
        create: { key: 'partnership_config', value: JSON.stringify(config) }
      });

      return interaction.reply({ content: '✅ Sistema de parcerias configurado com sucesso!', flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error('Erro ao configurar parcerias:', error);
      return interaction.reply({ content: '❌ Erro ao salvar configurações.', flags: MessageFlags.Ephemeral });
    }
  }
};
