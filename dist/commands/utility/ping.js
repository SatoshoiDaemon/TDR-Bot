import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { EMBED_COLORS } from '../../shared/embedTheme.js';
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
export const pingCommand = {
    name: 'ping',
    description: 'Verifica a latência do bot',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica a latência do bot'),
    async execute(interactionOrMessage, client, database) {
        const startTime = Date.now();
        if (interactionOrMessage instanceof Message) {
            const channel = interactionOrMessage.channel;
            if (channel.isTextBased() && 'send' in channel) {
                const sent = await channel.send('Medindo latência...');
                const latency = Date.now() - startTime;
                const apiLatency = Math.round(client.ws.ping);
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.PRIMARY)
                    .setTitle('Latência')
                    .addFields({ name: 'Latência da API', value: `${apiLatency}ms`, inline: true }, { name: 'Latência de Resposta', value: `${latency}ms`, inline: true })
                    .setTimestamp();
                await sent.edit({ content: '', embeds: [embed] });
            }
        }
        else {
            await interactionOrMessage.deferReply();
            const latency = Date.now() - startTime;
            const apiLatency = Math.round(client.ws.ping);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('Latência')
                .addFields({ name: 'Latência da API', value: `${apiLatency}ms`, inline: true }, { name: 'Latência de Resposta', value: `${latency}ms`, inline: true })
                .setTimestamp();
            await interactionOrMessage.editReply({ embeds: [embed] });
        }
    }
};
//# sourceMappingURL=ping.js.map