import { SlashCommandBuilder, EmbedBuilder, Message, version } from 'discord.js';
import os from 'os';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const botinfoCommand = {
    name: 'botinfo',
    description: 'Informações técnicas do bot',
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Informações técnicas do bot'),
    async execute(interactionOrMessage, client) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('Informações do Bot')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields({ name: 'Desenvolvedor', value: 'Axiom.ts', inline: true }, { name: 'Biblioteca', value: `Discord.js v${version}`, inline: true }, { name: 'Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true }, { name: 'Memória', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }, { name: 'Servidores', value: `${client.guilds.cache.size}`, inline: true }, { name: 'Sistema', value: `${os.platform()} ${os.arch()}`, inline: true })
            .setFooter({ text: EMBED_CREDIT })
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
//# sourceMappingURL=botinfo.js.map