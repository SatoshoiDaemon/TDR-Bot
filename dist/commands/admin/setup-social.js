import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { logger } from '../../shared/logger.js';
export const setupSocialCommand = {
    name: 'setup-social',
    description: 'Configura os sistemas de Sugestões e Feed Imperial',
    data: new SlashCommandBuilder()
        .setName('setup-social')
        .setDescription('Configura os sistemas de Sugestões e Feed Imperial')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('suggestion')
        .setDescription('Configura o sistema de sugestões')
        .addChannelOption(o => o.setName('canal').setDescription('Canal onde as sugestões serão enviadas').setRequired(true))
        .addStringOption(o => o.setName('webhook').setDescription('URL do Webhook (opcional)').setRequired(false)))
        .addSubcommand(sub => sub.setName('feed')
        .setDescription('Configura o sistema de Feed Imperial')
        .addChannelOption(o => o.setName('canal').setDescription('Canal onde as fotos serão postadas').setRequired(true))
        .addRoleOption(o => o.setName('cargo_verificado').setDescription('Cargo necessário para postar').setRequired(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'suggestion') {
                const channel = interaction.options.getChannel('canal', true);
                const webhookUrl = interaction.options.getString('webhook');
                const config = { channelId: channel.id, webhookUrl };
                await prisma.systemConfig.upsert({
                    where: { key: 'suggestion_config' },
                    update: { value: JSON.stringify(config) },
                    create: { key: 'suggestion_config', value: JSON.stringify(config) }
                });
                return interaction.reply({ content: `✅ Sistema de sugestões configurado no canal ${channel.toString()}!`, flags: MessageFlags.Ephemeral });
            }
            if (subcommand === 'feed') {
                const channel = interaction.options.getChannel('canal', true);
                const role = interaction.options.getRole('cargo_verificado', true);
                const config = { channelId: channel.id, verifiedRoleId: role.id };
                await prisma.systemConfig.upsert({
                    where: { key: 'feed_config' },
                    update: { value: JSON.stringify(config) },
                    create: { key: 'feed_config', value: JSON.stringify(config) }
                });
                return interaction.reply({ content: `✅ Sistema de Feed configurated no canal ${channel.toString()} com o cargo ${role.toString()}!`, flags: MessageFlags.Ephemeral });
            }
        }
        catch (error) {
            logger.error('Erro ao configurar sistemas sociais:', error);
            return interaction.reply({ content: '❌ Ocorreu um erro ao salvar as configurações.', flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=setup-social.js.map