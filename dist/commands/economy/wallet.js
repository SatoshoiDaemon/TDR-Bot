import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { EconomyService } from '../../services/economyService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const walletCommand = {
    name: 'wallet',
    description: 'Mostra o saldo atual na carteira e no banco',
    aliases: ['bal', 'atm', 'carteira'],
    data: new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Mostra o saldo atual na carteira e no banco')
        .addUserOption(option => option.setName('user').setDescription('Usuário para ver o saldo')),
    async execute(interactionOrMessage) {
        const targetUser = interactionOrMessage instanceof Message
            ? interactionOrMessage.mentions.users.first() || interactionOrMessage.author
            : interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
        const balance = await EconomyService.getBalance(targetUser.id, targetUser.username);
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle(`Saldo — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: 'Carteira', value: `${balance.wallet.toLocaleString()} Dracmas`, inline: true }, { name: 'Banco', value: `${balance.bank.toLocaleString()} Dracmas`, inline: true }, { name: 'Total', value: `${(balance.wallet + balance.bank).toLocaleString()} Dracmas`, inline: false })
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        if (interactionOrMessage instanceof Message) {
            const ch = interactionOrMessage.channel;
            if (ch?.isTextBased() && 'send' in ch)
                await ch.send({ embeds: [embed] });
            else
                await interactionOrMessage.reply({ embeds: [embed] });
        }
        else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    }
};
//# sourceMappingURL=wallet.js.map