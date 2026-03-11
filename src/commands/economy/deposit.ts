import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message ,
    MessageFlags
} from 'discord.js';
import { EconomyService } from '@services/economyService.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { logger } from '@shared/logger.js';

export const depositCommand = {
    name: 'deposit',
    description: 'Deposita dracmas da sua carteira no banco',
    aliases: ['depositar', 'dep'],
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposita dracmas da sua carteira no banco')
        .addStringOption(o =>
            o.setName('amount')
                .setDescription('Quantidade a depositar (ou "all"/"tudo")')
                .setRequired(true)
        ),

    async execute(interactionOrMessage: ChatInputCommandInteraction | Message, client: any, db: any, args?: string[]) {
        // 1. Obter Usuário
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const username = interactionOrMessage instanceof Message ? interactionOrMessage.author.username : interactionOrMessage.user.username;

        // 2. Obter Argumento
        let amountStr: string;

        if (interactionOrMessage instanceof Message) {
            amountStr = args?.[0] || '';
        } else {
            amountStr = interactionOrMessage.options.getString('amount', true);
        }

        if (!amountStr) {
            const msg = '❌ Uso: `rg!deposit <valor | all>`';
            if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }

        // 3. Processar Quantidade
        let amount: number | 'all';
        if (['all', 'tudo', 'todo'].includes(amountStr.toLowerCase())) {
            amount = 'all';
        } else {
            const parsed = parseInt(amountStr.replace(/[^0-9]/g, ''));
            if (isNaN(parsed) || parsed <= 0) {
                const msg = '❌ Valor inválido. Digite um número positivo ou "all".';
                if (interactionOrMessage instanceof Message) return interactionOrMessage.reply(msg);
                return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            amount = parsed;
        }

        // 4. Executar Depósito
        try {
            const result = await EconomyService.deposit(userId, amount, username);

            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('🏦 Depósito Realizado')
                .setDescription(`Você depositou **${result.amount.toLocaleString()} Dracmas** no banco.\n\n💰 **Novo Saldo na Carteira:** ${result.newBalance.toLocaleString()} Dracmas`)
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();

            if (interactionOrMessage instanceof Message) await interactionOrMessage.reply({ embeds: [embed] });
            else await interactionOrMessage.reply({ embeds: [embed] });

        } catch (error: any) {
            const msg = `❌ ${error.message}`;
            if (interactionOrMessage instanceof Message) await interactionOrMessage.reply(msg);
            else await interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
