import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextChannel } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export const partnerPanelCommand = {
    name: 'partner-panel',
    description: 'Invia o painel de solicitação de parcerias para o canal atual',
    data: new SlashCommandBuilder()
        .setName('partner-panel')
        .setDescription('Invia o painel de solicitação de parcerias para o canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('🤝 Sistema de Parcerias')
            .setDescription('Quer firmar uma parceria com nosso servidor? Preencha o formulário clicando no botão abaixo e aguarde a análise de nossa equipe!')
            .setFooter({ text: EMBED_CREDIT });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('partner_apply')
                .setLabel('Solicitar Parceria')
                .setEmoji('🤝')
                .setStyle(ButtonStyle.Success)
        );

        if (interaction.channel?.isTextBased() && 'send' in interaction.channel) {
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ Painel enviado com sucesso!', flags: MessageFlags.Ephemeral });
        }

        return interaction.reply({ content: '❌ Não foi possível carregar o canal para enviar o embed.', flags: MessageFlags.Ephemeral });
    }
};
