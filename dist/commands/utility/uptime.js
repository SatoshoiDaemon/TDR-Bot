import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { EMBED_COLORS } from '../../shared/embedTheme.js';
export const uptimeCommand = {
    name: 'uptime',
    description: 'Tempo de atividade do bot',
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Tempo de atividade do bot'),
    async execute(interactionOrMessage) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('Tempo de Atividade')
            .setDescription(`**${days}d ${hours}h ${minutes}m ${seconds}s**`)
            .setTimestamp();
        if (interactionOrMessage instanceof Message) {
            const ch = interactionOrMessage.channel;
            if (ch?.isTextBased() && 'send' in ch)
                await ch.send({ embeds: [embed] });
        }
        else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    }
};
//# sourceMappingURL=uptime.js.map