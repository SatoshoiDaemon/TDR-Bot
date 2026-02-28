import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../../shared/embedTheme.js';
export const calcCommand = {
    name: 'calc',
    description: 'Realiza cálculos matemáticos simples',
    aliases: ['calcular', 'math'],
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('Realiza cálculos matemáticos simples')
        .addStringOption(o => o.setName('expressao').setDescription('A expressão matemática (ex: 2 + 2)').setRequired(true)),
    async execute(interactionOrMessage, client, db, args) {
        let expression = '';
        if (interactionOrMessage instanceof Message) {
            expression = args?.join(' ') || '';
        }
        else {
            expression = interactionOrMessage.options.getString('expressao', true);
        }
        if (!expression) {
            const msg = '❌ Forneça uma expressão matemática.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        try {
            // Limpeza básica para segurança (apenas números e operadores)
            const cleanExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
            // Usando Function como um "eval" seguro para matemática simples
            // Em um ambiente real, usar uma biblioteca como mathjs seria melhor
            const result = new Function(`return ${cleanExpression}`)();
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('🔢 Calculadora')
                .addFields({ name: '📝 Expressão', value: `\`\`\`${expression}\`\`\`` }, { name: '✅ Resultado', value: `\`\`\`${result}\`\`\`` })
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            if (interactionOrMessage instanceof Message) {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
            else {
                await interactionOrMessage.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            const msg = '❌ Expressão inválida.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=calc.js.map