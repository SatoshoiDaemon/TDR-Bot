import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, Message } from 'discord.js';
import { SnapshotScheduler } from '../../scheduler/scheduler.js';
import { snapshotDb } from '../../database/client.js';
import { appConfig } from '../../shared/config.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
async function replyOrSend(interactionOrMessage, content) {
    if (interactionOrMessage instanceof Message) {
        const channel = interactionOrMessage.channel;
        if (channel.isTextBased() && 'send' in channel) {
            if (typeof content === 'string') {
                await channel.send(content);
            }
            else {
                await channel.send(content);
            }
        }
    }
    else {
        if (interactionOrMessage.deferred || interactionOrMessage.replied) {
            await interactionOrMessage.editReply(content);
        }
        else {
            await interactionOrMessage.reply(typeof content === 'string' ? { content } : content);
        }
    }
}
async function deferOrReact(interactionOrMessage) {
    if (interactionOrMessage instanceof Message) {
        await interactionOrMessage.react('⏳');
    }
    else {
        await interactionOrMessage.deferReply();
    }
}
export const snapshotCommand = {
    name: 'snapshot',
    description: 'Executa um snapshot manual da estrutura do servidor',
    data: new SlashCommandBuilder()
        .setName('snapshot')
        .setDescription('Executa um snapshot manual da estrutura do servidor'),
    async execute(interactionOrMessage, client, database, args) {
        const member = interactionOrMessage instanceof Message
            ? interactionOrMessage.member
            : interactionOrMessage.member;
        if (!member || !(member.permissions instanceof PermissionsBitField) || !member.permissions.has('Administrator')) {
            await replyOrSend(interactionOrMessage, {
                content: 'Permissão negada. Requer administrador.'
            });
            return;
        }
        await deferOrReact(interactionOrMessage);
        const scheduler = new SnapshotScheduler(client, snapshotDb, {
            guildId: appConfig.discord.guildId,
            backupGuildIds: appConfig.discord.backupGuildIds,
            systemCategory: appConfig.discord.systemCategory,
            snapshotHour: appConfig.discord.snapshotHour,
            webhookUrl: appConfig.backup.webhookUrl
        });
        try {
            const startTime = Date.now();
            // Etapa 1: Snapshot da guild
            await replyOrSend(interactionOrMessage, {
                content: '**Etapa 1/3:** Criando snapshot completo da guild...'
            });
            const snapshotService = scheduler.snapshotService;
            if (!snapshotService) {
                throw new Error('Serviço de snapshot não inicializado');
            }
            await snapshotService.createGuildSnapshot(appConfig.discord.guildId);
            // Etapa 2: Snapshot da categoria
            await replyOrSend(interactionOrMessage, {
                content: '**Etapa 2/3:** Criando snapshot da categoria...'
            });
            await snapshotService.createCategorySnapshot(appConfig.discord.guildId, appConfig.discord.systemCategory);
            // Etapa 3: Espelhamento para todos os backups (sequencial)
            const totalBackups = appConfig.discord.backupGuildIds.length;
            await replyOrSend(interactionOrMessage, {
                content: `**Etapa 3/${2 + totalBackups}:** Sincronizando com ${totalBackups} servidor(s) de backup (sequencial)...`
            });
            const mirrorService = scheduler.mirrorService;
            for (let i = 0; i < appConfig.discord.backupGuildIds.length; i++) {
                const backupGuildId = appConfig.discord.backupGuildIds[i];
                await replyOrSend(interactionOrMessage, {
                    content: `**Etapa ${4 + i}/${2 + totalBackups}:** Sincronizando com backup ${i + 1}/${totalBackups} (${backupGuildId})...`
                });
                try {
                    await mirrorService.mirrorCategory(appConfig.discord.guildId, backupGuildId, appConfig.discord.systemCategory);
                }
                catch (error) {
                    console.error(`Erro ao espelhar para backup ${i + 1}:`, error);
                    throw new Error(`Falha ao sincronizar com backup ${i + 1}/${totalBackups}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('Snapshot Concluído')
                .setDescription('Processo finalizado com sucesso.')
                .addFields({ name: 'Duração', value: `${duration}s`, inline: true }, { name: 'Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true })
                .setFooter({ text: `${EMBED_CREDIT} · Use ${appConfig.commands.prefix}status para detalhes` })
                .setTimestamp();
            await replyOrSend(interactionOrMessage, {
                content: '',
                embeds: [embed]
            });
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            await replyOrSend(interactionOrMessage, {
                content: `Erro na execução: ${errorMsg}`
            });
        }
    }
};
//# sourceMappingURL=snapshot.js.map