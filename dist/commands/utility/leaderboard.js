import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
import { logger } from '../../shared/logger.js';
export const leaderboardCommand = {
    name: 'leaderboard',
    description: 'Mostra o ranking de XP ou dracmas do servidor',
    aliases: ['lb', 'top', 'ranking'],
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Mostra o ranking de XP ou dracmas do servidor')
        .addStringOption(option => option
        .setName('type')
        .setDescription('Tipo de ranking')
        .setRequired(true)
        .addChoices({ name: '⭐ XP/Nível', value: 'xp' }, { name: '📅 Atividade Semanal (XP)', value: 'weekly_xp' }, { name: '💬 Mensagens Semanais', value: 'weekly_msg' }, { name: '🏆 Pontos de Evento', value: 'events' }, { name: '🌟 Estrelas de Perfil', value: 'stars' }, { name: '💰 Dracmas Total', value: 'money' }))
        .addIntegerOption(option => option
        .setName('page')
        .setDescription('Página do ranking (10 por página)')
        .setMinValue(1)),
    async execute(interactionOrMessage, client, db, args) {
        if (interactionOrMessage instanceof Message) {
            const type = args?.[0]?.toLowerCase() || 'xp';
            const page = parseInt(args?.[1] || '1');
            await this.handleLogic(interactionOrMessage, type, page);
        }
        else {
            const type = interactionOrMessage.options.getString('type', true);
            const page = interactionOrMessage.options.getInteger('page') || 1;
            await this.handleLogic(interactionOrMessage, type, page);
        }
    },
    async handleLogic(ctx, type, page) {
        try {
            const itemsPerPage = 10;
            const skip = (page - 1) * itemsPerPage;
            let data = [];
            let totalCount = 0;
            let title = '';
            let icon = '';
            if (type === 'xp') {
                const levels = await prisma.level.findMany({
                    orderBy: [{ level: 'desc' }, { xp: 'desc' }],
                    take: itemsPerPage,
                    skip: skip,
                    include: { user: { select: { username: true } } }
                });
                totalCount = await prisma.level.count();
                data = levels.map((l, idx) => ({
                    position: skip + idx + 1,
                    username: l.user.username,
                    value: `Nível \`${l.level}\` — \`${l.xp.toLocaleString()} XP\``
                }));
                title = '⭐ Ranking de Experiência';
                icon = '⭐';
            }
            else if (type === 'weekly_xp') {
                const levels = await prisma.level.findMany({
                    orderBy: { weeklyXp: 'desc' },
                    take: itemsPerPage,
                    skip: skip,
                    include: { user: { select: { username: true } } }
                });
                totalCount = await prisma.level.count();
                data = levels.map((l, idx) => ({
                    position: skip + idx + 1,
                    username: l.user.username,
                    value: `\`${l.weeklyXp.toLocaleString()} XP\` esta semana`
                }));
                title = '📅 Atividade Semanal (XP)';
                icon = '📅';
            }
            else if (type === 'weekly_msg') {
                const levels = await prisma.level.findMany({
                    orderBy: { weeklyMessages: 'desc' },
                    take: itemsPerPage,
                    skip: skip,
                    include: { user: { select: { username: true } } }
                });
                totalCount = await prisma.level.count();
                data = levels.map((l, idx) => ({
                    position: skip + idx + 1,
                    username: l.user.username,
                    value: `\`${l.weeklyMessages.toLocaleString()} mensagens\` esta semana`
                }));
                title = '💬 Mensagens Semanais';
                icon = '💬';
            }
            else if (type === 'events') {
                const levels = await prisma.level.findMany({
                    orderBy: { eventPoints: 'desc' },
                    take: itemsPerPage,
                    skip: skip,
                    include: { user: { select: { username: true } } }
                });
                totalCount = await prisma.level.count();
                data = levels.map((l, idx) => ({
                    position: skip + idx + 1,
                    username: l.user.username,
                    value: `\`${l.eventPoints.toLocaleString()} pontos\` de evento`
                }));
                title = '🏆 Ranking de Eventos';
                icon = '🏆';
            }
            else if (type === 'stars') {
                const profiles = await prisma.userProfile.findMany({
                    orderBy: { stars: 'desc' },
                    take: itemsPerPage,
                    skip: skip
                });
                totalCount = await prisma.userProfile.count();
                // Buscar nomes de usuários
                data = await Promise.all(profiles.map(async (p, idx) => {
                    const user = await prisma.user.findUnique({ where: { id: p.id }, select: { username: true } });
                    return {
                        position: skip + idx + 1,
                        username: user?.username || 'Usuário Desconhecido',
                        value: `\`${p.stars.toLocaleString()} estrelas\` 🌟`
                    };
                }));
                title = '🌟 Ranking de Estrelas (Star Board)';
                icon = '🌟';
            }
            else {
                let orderBy = {};
                if (type === 'wallet') {
                    orderBy = { wallet: 'desc' };
                    title = '💵 Ranking de Carteira';
                }
                else if (type === 'bank') {
                    orderBy = { bank: 'desc' };
                    title = '🏦 Ranking de Banco';
                }
                else {
                    title = '💰 Ranking de Dracmas Total';
                }
                const economies = await prisma.economy.findMany({
                    include: { user: { select: { username: true } } }
                });
                if (type === 'money') {
                    economies.sort((a, b) => Number(b.wallet + b.bank) - Number(a.wallet + a.bank));
                }
                else if (type === 'wallet') {
                    economies.sort((a, b) => Number(b.wallet) - Number(a.wallet));
                }
                else {
                    economies.sort((a, b) => Number(b.bank) - Number(a.bank));
                }
                totalCount = economies.length;
                const paginated = economies.slice(skip, skip + itemsPerPage);
                data = paginated.map((e, idx) => {
                    let val = 0;
                    if (type === 'wallet')
                        val = Number(e.wallet);
                    else if (type === 'bank')
                        val = Number(e.bank);
                    else
                        val = Number(e.wallet + e.bank);
                    return {
                        position: skip + idx + 1,
                        username: e.user.username,
                        value: `\`${val.toLocaleString('pt-BR')} Dracmas\``
                    };
                });
            }
            if (data.length === 0) {
                const msg = 'Nenhum dado encontrado para este ranking.';
                if (ctx instanceof Message)
                    return ctx.reply(msg);
                return ctx.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            const description = data.map(item => {
                const medal = item.position === 1 ? '🥇' : item.position === 2 ? '🥈' : item.position === 3 ? '🥉' : `\`#${item.position}\``;
                return `${medal} **${item.username}**\n> ${item.value}`;
            }).join('\n\n');
            const totalPages = Math.ceil(totalCount / itemsPerPage);
            const userId = ctx instanceof Message ? ctx.author.id : ctx.user.id;
            const userPosition = await this.getUserPosition(userId, type);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle(`${icon || ''} ${title}`)
                .setDescription(description)
                .addFields({ name: '👤 Sua Posição', value: userPosition ? `> Você está em **#${userPosition}**` : '> Você ainda não possui registro.' })
                .setFooter({ text: `${EMBED_CREDIT} • Página ${page}/${totalPages}` })
                .setTimestamp();
            if (ctx instanceof Message) {
                await ctx.reply({ embeds: [embed] });
            }
            else {
                await ctx.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error('Erro ao buscar leaderboard:', error);
            const msg = '❌ Erro ao buscar o ranking.';
            if (ctx instanceof Message)
                await ctx.reply(msg);
            else
                await ctx.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    },
    async getUserPosition(userId, type) {
        try {
            if (type === 'xp') {
                const userLevel = await prisma.level.findUnique({ where: { userId } });
                if (!userLevel)
                    return null;
                const betterCount = await prisma.level.count({
                    where: { OR: [{ level: { gt: userLevel.level } }, { level: userLevel.level, xp: { gt: userLevel.xp } }] }
                });
                return betterCount + 1;
            }
            else if (type === 'weekly_xp') {
                const userLevel = await prisma.level.findUnique({ where: { userId } });
                if (!userLevel)
                    return null;
                const betterCount = await prisma.level.count({ where: { weeklyXp: { gt: userLevel.weeklyXp } } });
                return betterCount + 1;
            }
            else if (type === 'weekly_msg') {
                const userLevel = await prisma.level.findUnique({ where: { userId } });
                if (!userLevel)
                    return null;
                const betterCount = await prisma.level.count({ where: { weeklyMessages: { gt: userLevel.weeklyMessages } } });
                return betterCount + 1;
            }
            else if (type === 'events') {
                const userLevel = await prisma.level.findUnique({ where: { userId } });
                if (!userLevel)
                    return null;
                const betterCount = await prisma.level.count({ where: { eventPoints: { gt: userLevel.eventPoints } } });
                return betterCount + 1;
            }
            else if (type === 'stars') {
                const userProfile = await prisma.userProfile.findUnique({ where: { id: userId } });
                if (!userProfile)
                    return null;
                const betterCount = await prisma.userProfile.count({ where: { stars: { gt: userProfile.stars } } });
                return betterCount + 1;
            }
            else {
                const all = await prisma.economy.findMany();
                if (type === 'wallet')
                    all.sort((a, b) => Number(b.wallet) - Number(a.wallet));
                else if (type === 'bank')
                    all.sort((a, b) => Number(b.bank) - Number(a.bank));
                else
                    all.sort((a, b) => Number(b.wallet + b.bank) - Number(a.wallet + a.bank));
                const pos = all.findIndex((e) => e.userId === userId);
                return pos === -1 ? null : pos + 1;
            }
        }
        catch {
            return null;
        }
    }
};
//# sourceMappingURL=leaderboard.js.map