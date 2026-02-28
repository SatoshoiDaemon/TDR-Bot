import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
import { PermissionUtils } from '../../shared/utils/permissionUtils.js';
import { logger } from '../../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const manageLevelCommand = {
    name: 'manage-level',
    description: 'Gerencia o XP e Nível de um usuário',
    aliases: ['xp', 'level'],
    data: new SlashCommandBuilder()
        .setName('manage-level')
        .setDescription('Gerencia o XP e Nível de um usuário')
        .addSubcommand(sub => sub.setName('addxp').setDescription('Adiciona XP a um usuário').addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Quantidade').setRequired(true)))
        .addSubcommand(sub => sub.setName('removexp').setDescription('Remove XP de um usuário').addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Quantidade').setRequired(true)))
        .addSubcommand(sub => sub.setName('setlevel').setDescription('Define o nível de um usuário').addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true)).addIntegerOption(o => o.setName('level').setDescription('Nível').setRequired(true))),
    async execute(interactionOrMessage, client, db, args) {
        const member = interactionOrMessage.member;
        if (!PermissionUtils.isStaff(member)) {
            const msg = 'Permissão negada.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        if (interactionOrMessage instanceof Message) {
            // Lógica simplificada para comandos de prefixo
            const sub = args?.[0]?.toLowerCase();
            const target = interactionOrMessage.mentions.members?.first();
            const value = parseInt(args?.[2] || '0');
            if (!sub || !target || isNaN(value)) {
                return interactionOrMessage.reply('Uso: `rg!xp <addxp|removexp|setlevel> <@usuário> <valor>`');
            }
            await this.handleLogic(interactionOrMessage, sub, target, value);
        }
        else {
            const sub = interactionOrMessage.options.getSubcommand();
            const target = interactionOrMessage.options.getMember('user');
            const value = interactionOrMessage.options.getInteger('amount') || interactionOrMessage.options.getInteger('level') || 0;
            await this.handleLogic(interactionOrMessage, sub, target, value);
        }
    },
    async handleLogic(ctx, sub, target, value) {
        try {
            // Garantir que o usuário existe no banco
            await prisma.user.upsert({
                where: { id: target.id },
                update: { username: target.user.username },
                create: { id: target.id, username: target.user.username }
            });
            let updated;
            if (sub === 'addxp' || sub === 'removexp') {
                const amount = sub === 'addxp' ? value : -value;
                updated = await prisma.level.upsert({
                    where: { userId: target.id },
                    update: { xp: { increment: amount } },
                    create: { userId: target.id, xp: value > 0 ? value : 0, level: 0 }
                });
            }
            else {
                updated = await prisma.level.upsert({
                    where: { userId: target.id },
                    update: { level: value },
                    create: { userId: target.id, xp: 0, level: value }
                });
            }
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('Alteração Realizada')
                .setDescription(`Status de **${target.user.username}** atualizado.`)
                .addFields({ name: 'Novo XP', value: updated.xp.toString(), inline: true }, { name: 'Novo Nível', value: updated.level.toString(), inline: true })
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            if (ctx instanceof Message) {
                const ch = ctx.channel;
                if (ch?.isTextBased() && 'send' in ch)
                    await ch.send({ embeds: [embed] });
            }
            else
                await ctx.reply({ embeds: [embed] });
        }
        catch (error) {
            logger.error('Erro ao gerenciar nível:', error);
            const msg = 'Erro ao processar a alteração.';
            if (ctx instanceof Message)
                await ctx.reply(msg);
            else
                await ctx.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=manage-level.js.map