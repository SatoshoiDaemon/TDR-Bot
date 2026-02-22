import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, GuildMember ,
    MessageFlags
} from 'discord.js';
import { prisma } from '@database/client.js';
import { PermissionUtils } from '@shared/utils/permissionUtils.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

export const addMoneyCommand = {
  name: 'add-money',
  description: 'Adiciona dracmas à carteira ou banco de um usuário',
  aliases: ['addmoney', 'addcash'],
  data: new SlashCommandBuilder()
    .setName('add-money')
    .setDescription('Adiciona dracmas à carteira ou banco de um usuário')
    .addUserOption(o => o.setName('user').setDescription('Usuário').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Quantidade').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('location').setDescription('Onde adicionar').setRequired(true).addChoices(
      { name: 'Carteira', value: 'wallet' },
      { name: 'Banco', value: 'bank' }
    )),

  async execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]) {
    const member = interactionOrMessage.member as GuildMember;

    if (!PermissionUtils.isStaff(member)) {
      const msg = '❌ Permissão negada.';
      if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
      return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    if (interactionOrMessage instanceof Message) {
      // Lógica para comandos de prefixo
      const target = interactionOrMessage.mentions.members?.first();
      const amount = parseInt(args?.[0] || '0');
      const location = args?.[1]?.toLowerCase() === 'bank' ? 'bank' : 'wallet';

      if (!target || isNaN(amount) || amount <= 0) {
        return interactionOrMessage.reply('❌ Uso: `rg!addmoney <@usuário> <valor> [wallet|bank]`');
      }

      await this.handleLogic(interactionOrMessage, target, amount, location);
    } else {
      const target = interactionOrMessage.options.getMember('user') as GuildMember;
      const amount = interactionOrMessage.options.getInteger('amount', true);
      const location = interactionOrMessage.options.getString('location', true) as 'wallet' | 'bank';
      
      await this.handleLogic(interactionOrMessage, target, amount, location);
    }
  },

  async handleLogic(ctx: ChatInputCommandInteraction | Message, target: GuildMember, amount: number, location: 'wallet' | 'bank') {
    try {
      // Garantir que o usuário existe no banco
      await prisma.user.upsert({
        where: { id: target.id },
        update: { username: target.user.username },
        create: { id: target.id, username: target.user.username }
      });

      // Adicionar dracmas
      const updated = await prisma.economy.upsert({
        where: { userId: target.id },
        update: { [location]: { increment: BigInt(amount) } },
        create: { userId: target.id, wallet: location === 'wallet' ? BigInt(amount) : BigInt(0), bank: location === 'bank' ? BigInt(amount) : BigInt(0) }
      });

      // Registrar transação
      await prisma.transaction.create({
        data: {
          userId: target.id,
          amount: BigInt(amount),
          type: 'deposit',
          status: 'success',
          description: `Adicionado por staff: ${amount} dracmas na ${location === 'wallet' ? 'carteira' : 'banco'}`
        }
      });

      const locationName = location === 'wallet' ? 'Carteira' : 'Banco';
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.SUCCESS)
        .setTitle('💰 Dracmas Adicionado')
        .setDescription(`**${amount.toLocaleString('pt-BR')}** dracmas foram adicionadas à **${locationName}** de **${target.user.username}**.`)
        .addFields(
          { name: '💵 Carteira Atual', value: updated.wallet.toString(), inline: true },
          { name: '🏦 Banco Atual', value: updated.bank.toString(), inline: true }
        )
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      if (ctx instanceof Message) {
        const ch = ctx.channel;
        if (ch?.isTextBased() && 'send' in ch) await ch.send({ embeds: [embed] });
      }
      else await ctx.reply({ embeds: [embed] });

    } catch (error) {
      logger.error('Erro ao adicionar dracmas:', error);
      const msg = '❌ Erro ao processar a operação.';
      if (ctx instanceof Message) await ctx.reply(msg);
      else await ctx.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }
  }
};
