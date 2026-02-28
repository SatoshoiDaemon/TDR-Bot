import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { appConfig } from '../../shared/config.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const helpCommand = {
    name: 'help',
    description: 'Lista os comandos disponíveis',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lista os comandos disponíveis'),
    async execute(interactionOrMessage) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('👑 Central de Ajuda — Trono dos Reis')
            .setDescription(`Utilize o prefixo \`${appConfig.commands.prefix}\` ou comandos de barra \`/\` para interagir comigo.`)
            .addFields({ name: '🛠️ Utilitários', value: '`help`, `ping`, `uptime`, `botinfo`, `userinfo`, `avatar`, `banner`, `serverinfo`, `leaderboard`, `suggest`, `post`, `partner-apply`, `partner-rank`' }, { name: '🛡️ Administração', value: '`snapshot`, `mirror`, `status`, `say`, `create-roll`, `manage-level`, `manage-events`, `setup-social`, `setup-partnership`, `add-money`, `remove-money`' }, { name: '💰 Economia', value: '`wallet`, `daily`, `collect`, `shop`, `inventory`, `pay`, `deposit`, `withdraw`' }, { name: '🎮 Diversão', value: '`blackjack`, `mines`, `roulette`, `ask`' }, { name: '✨ Interações', value: '`hug`, `kiss`, `highfive`, `cheers`, `dance`, `happy`, `wave`, `slap`, `poke`, `bite`, `bonk`, `cry`' }, { name: '📈 Evolução', value: '`rank`' })
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        if (interactionOrMessage instanceof Message) {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
        else {
            await interactionOrMessage.reply({ embeds: [embed] });
        }
    }
};
//# sourceMappingURL=help.js.map