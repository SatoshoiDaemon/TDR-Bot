import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField, Message, MessageFlags } from 'discord.js';
import { MirrorService } from '../../services/mirrorService.js';
import { snapshotDb } from '../../database/client.js';
import { appConfig } from '../../shared/config.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const mirrorCommand = {
    name: 'mirror',
    description: 'Espelha manualmente uma categoria para o servidor de backup',
    data: new SlashCommandBuilder()
        .setName('mirror')
        .setDescription('Espelha manualmente uma categoria para o servidor de backup')
        .addStringOption(option => option
        .setName('modo')
        .setDescription('Modo de sincronização')
        .addChoices({ name: 'Completo (copiar todas as mensagens)', value: 'full' }, { name: 'Simulação (mostrar o que aconteceria)', value: 'dryrun' })
        .setRequired(false)),
    async execute(interactionOrMessage, client) {
        const member = interactionOrMessage.member;
        if (!member || !(member.permissions instanceof PermissionsBitField) || !member.permissions.has('Administrator')) {
            const msg = 'Permissão negada. Requer administrador.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        if (interactionOrMessage instanceof ChatInputCommandInteraction)
            await interactionOrMessage.deferReply();
        const mode = interactionOrMessage instanceof Message ? 'full' : (interactionOrMessage.options.getString('modo') || 'full');
        const mirrorService = new MirrorService(client, snapshotDb);
        try {
            const startTime = Date.now();
            if (mode === 'dryrun') {
                const analysis = await mirrorService.analyzeCategory(appConfig.discord.guildId, appConfig.discord.backupGuildIds[0], appConfig.discord.systemCategory);
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.PRIMARY)
                    .setTitle('Análise de Espelhamento (Simulação)')
                    .addFields({ name: 'Canais', value: analysis.channels.toString(), inline: true }, { name: 'Mensagens', value: analysis.messages.toString(), inline: true }, { name: 'Threads', value: analysis.threads.toString(), inline: true })
                    .setTimestamp();
                if (interactionOrMessage instanceof Message) {
                    const ch = interactionOrMessage.channel;
                    if (ch?.isTextBased() && 'send' in ch)
                        await ch.send({ embeds: [embed] });
                }
                else
                    await interactionOrMessage.editReply({ embeds: [embed] });
            }
            else {
                const backupGuildId = appConfig.discord.backupGuildIds[0];
                if (!backupGuildId)
                    throw new Error('Nenhum servidor de backup configurado.');
                await mirrorService.mirrorCategory(appConfig.discord.guildId, backupGuildId, appConfig.discord.systemCategory);
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.SUCCESS)
                    .setTitle('Espelhamento Concluído')
                    .setDescription(`Finalizado em ${duration}s.`)
                    .setFooter({ text: EMBED_CREDIT })
                    .setTimestamp();
                if (interactionOrMessage instanceof Message) {
                    const ch = interactionOrMessage.channel;
                    if (ch?.isTextBased() && 'send' in ch)
                        await ch.send({ embeds: [embed] });
                }
                else
                    await interactionOrMessage.editReply({ embeds: [embed] });
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (interactionOrMessage instanceof Message)
                await interactionOrMessage.reply(`Erro: ${errorMsg}`);
            else
                await interactionOrMessage.editReply(`Erro: ${errorMsg}`);
        }
    }
};
//# sourceMappingURL=mirror.js.map