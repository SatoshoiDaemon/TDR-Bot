import { SlashCommandBuilder, EmbedBuilder, Message } from 'discord.js';
import { prisma } from '../../database/client.js';
import { EMBED_CREDIT } from '../../shared/embedTheme.js';
import { LevelService } from '../../services/levelService.js';
import { EconomyService } from '../../services/economyService.js';
import { profileConfig } from '../../shared/config/yamlLoader.js';
export const profileCommand = {
    name: 'perfil',
    description: 'Exibe o perfil completo do usuário',
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Exibe o perfil completo do usuário')
        .addUserOption(o => o.setName('user').setDescription('Usuário para ver o perfil')),
    async execute(interactionOrMessage) {
        if (!(interactionOrMessage instanceof Message)) {
            await interactionOrMessage.deferReply();
        }
        const target = interactionOrMessage instanceof Message
            ? interactionOrMessage.mentions.members?.first() || interactionOrMessage.member
            : interactionOrMessage.options.getMember('user') || interactionOrMessage.member;
        const userData = await prisma.user.findUnique({
            where: { id: target.id },
            include: {
                level: true,
                economy: true
            }
        });
        const rank = await LevelService.getRank(target.id);
        const balance = await EconomyService.getBalance(target.id);
        const userProfile = await prisma.userProfile.findUnique({ where: { id: target.id } });
        // Lógica de Hierarquia de Cargos
        const sortedRoles = target.roles.cache
            .filter(r => r.name !== '@everyone' && !profileConfig.ignored_roles.includes(r.id))
            .sort((a, b) => b.position - a.position);
        const topRole = sortedRoles.first()?.name || 'Cidadão';
        // Tempo de Servidor
        const joinedAt = target.joinedAt ? `<t:${Math.floor(target.joinedAt.getTime() / 1000)}:R>` : 'Desconhecido';
        // Barra de Progresso
        const xpNeeded = rank?.xpNeeded || 100;
        const currentXp = rank?.xp || 0;
        const percentage = Math.min(100, Math.floor((currentXp / xpNeeded) * 100));
        const progressBlocks = Math.floor(percentage / 10);
        const progressBar = '🟦'.repeat(progressBlocks) + '⬛'.repeat(10 - progressBlocks);
        // Processar Placeholders de Imagem
        const parseImage = (url) => {
            if (!url)
                return null;
            return url
                .replace(/{user.avatar}/g, target.user.displayAvatarURL())
                .replace(/{server.avatar}/g, target.guild.iconURL() || '');
        };
        const embed = new EmbedBuilder()
            .setColor((userData?.profileColor || profileConfig.defaults.color))
            .setAuthor({ name: `Perfil de ${target.user.username}`, iconURL: target.user.displayAvatarURL() })
            .setDescription(userData?.aboutMe || profileConfig.defaults.about_me)
            .setThumbnail(parseImage(userData?.thumbnailImage || profileConfig.defaults.thumbnail))
            .addFields({ name: '⭐ Nível', value: `\`${rank?.level || 0}\` (#${rank?.rankPosition || '?'})`, inline: true }, { name: '💰 Dracmas', value: `\`${(Number(balance.wallet) + Number(balance.bank)).toLocaleString()} Dracmas\``, inline: true }, { name: '🏆 Cargo', value: `\`${topRole}\``, inline: true }, { name: '📅 No Servidor', value: joinedAt, inline: true }, { name: '🌟 Estrelas', value: `\`${userProfile?.stars || 0}\``, inline: true }, { name: `📈 Progresso (${percentage}%)`, value: `${progressBar} \`${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()}\`` })
            .setFooter({ text: EMBED_CREDIT })
            .setTimestamp();
        const bgImage = parseImage(userData?.profileImage || profileConfig.defaults.image);
        if (bgImage)
            embed.setImage(bgImage);
        if (interactionOrMessage instanceof Message)
            await interactionOrMessage.reply({ embeds: [embed] });
        else
            await interactionOrMessage.editReply({ embeds: [embed] });
    }
};
//# sourceMappingURL=profile.js.map