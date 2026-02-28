import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { snapshotDb } from '../../database/client.js';
import { appConfig } from '../../shared/config.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
async function replyOrSend(interactionOrMessage, content) {
    if (interactionOrMessage instanceof Message) {
        const channel = interactionOrMessage.channel;
        if (channel.isTextBased() && 'send' in channel) {
            await channel.send(content);
        }
    }
    else {
        await interactionOrMessage.reply(content);
    }
}
export const statusCommand = {
    name: 'status',
    description: 'Verifica o status do bot e informações de backup',
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Verifica o status do bot e informações de backup'),
    async execute(interactionOrMessage, client) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        // Obter snapshots mais recentes
        const latestSnapshot = await snapshotDb.getLatestSnapshot(appConfig.discord.guildId, 'full');
        const snapshotTime = latestSnapshot
            ? new Date(latestSnapshot.timestamp).toLocaleString('pt-BR')
            : 'Nunca';
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('Status do Sistema')
            .setDescription('Estado atual do bot e do sistema de backup.')
            .addFields({ name: 'Servidores', value: client.guilds.cache.size.toString(), inline: true }, { name: 'Uptime', value: `${hours}h ${minutes}m`, inline: true }, { name: 'Banco de Dados', value: 'Conectado', inline: true }, { name: 'Próximo Snapshot', value: `${appConfig.discord.snapshotHour}:00 UTC`, inline: true }, { name: 'Último Snapshot', value: snapshotTime, inline: true }, { name: 'Memória', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true })
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        await replyOrSend(interactionOrMessage, { embeds: [embed] });
    }
};
//# sourceMappingURL=status.js.map