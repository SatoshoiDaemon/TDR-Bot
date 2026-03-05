import { SlashCommandBuilder, EmbedBuilder, Message, MessageFlags } from 'discord.js';
import { AIService } from '../../services/aiService.js';
import { aiConfig } from '../../shared/config/yamlLoader.js';
import { logger } from '../../shared/logger.js';
const aiService = new AIService();
async function sendTypingIndicator(channel) {
    if (aiConfig.responses.typing_indicator && 'sendTyping' in channel) {
        try {
            await channel.sendTyping();
        }
        catch (error) {
            // Ignorar erros de typing indicator
        }
    }
}
async function sendResponse(interactionOrMessage, response, username) {
    const useEmbed = aiConfig.responses.embed_responses;
    if (useEmbed) {
        const embed = new EmbedBuilder()
            .setColor(aiConfig.responses.embed_color)
            .setAuthor({ name: 'Igris AI', iconURL: interactionOrMessage.client.user?.displayAvatarURL() })
            .setDescription(response)
            .setTimestamp();
        if (aiConfig.responses.include_footer) {
            embed.setFooter({ text: aiConfig.responses.footer_text });
        }
        if (interactionOrMessage instanceof Message) {
            const sent = await interactionOrMessage.reply({ embeds: [embed] });
            if (aiConfig.responses.add_reactions) {
                for (const reaction of aiConfig.responses.reactions) {
                    await sent.react(reaction).catch(() => { });
                }
            }
        }
        else {
            await interactionOrMessage.editReply({ embeds: [embed] });
        }
    }
    else {
        const content = aiConfig.responses.mention_user
            ? `${interactionOrMessage instanceof Message ? interactionOrMessage.author : interactionOrMessage.user}, ${response}`
            : response;
        if (interactionOrMessage instanceof Message) {
            await interactionOrMessage.reply({ content });
        }
        else {
            await interactionOrMessage.editReply({ content });
        }
    }
}
export const askCommand = {
    name: 'ask',
    description: 'Faça uma pergunta para a IA do servidor',
    aliases: ['pergunta', 'ai', 'ia'],
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Faça uma pergunta para a IA do servidor')
        .addStringOption(option => option
        .setName('pergunta')
        .setDescription('Sua pergunta')
        .setRequired(true)),
    async execute(interactionOrMessage, client, database, args) {
        // Verificar se o sistema está habilitado
        if (!aiConfig.ai.enabled) {
            const errorMsg = '❌ O sistema de IA está temporariamente desabilitado.';
            if (interactionOrMessage instanceof Message) {
                await interactionOrMessage.reply(errorMsg);
            }
            else {
                await interactionOrMessage.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
            }
            return;
        }
        // Extrair pergunta
        let question;
        const userId = interactionOrMessage instanceof Message
            ? interactionOrMessage.author.id
            : interactionOrMessage.user.id;
        const username = interactionOrMessage instanceof Message
            ? interactionOrMessage.author.username
            : interactionOrMessage.user.username;
        if (interactionOrMessage instanceof Message) {
            question = args?.join(' ') || '';
            if (!question) {
                await interactionOrMessage.reply('❓ Por favor, faça uma pergunta. Exemplo: `rg!ask como funciona o sistema de economia?`');
                return;
            }
        }
        else {
            question = interactionOrMessage.options.getString('pergunta', true);
            await interactionOrMessage.deferReply();
        }
        try {
            // Enviar indicador de digitação
            if (interactionOrMessage instanceof Message) {
                await sendTypingIndicator(interactionOrMessage.channel);
            }
            // Processar com IA
            const response = await aiService.processMessage(userId, username, question);
            // Enviar resposta
            await sendResponse(interactionOrMessage, response, username);
            logger.info(`IA respondeu para ${username}: "${question.substring(0, 50)}..."`);
        }
        catch (error) {
            logger.error('Erro no comando ask:', error);
            const errorMsg = '❌ Ocorreu um erro ao processar sua pergunta. Tente novamente.';
            if (interactionOrMessage instanceof Message) {
                await interactionOrMessage.reply(errorMsg);
            }
            else {
                await interactionOrMessage.editReply({ content: errorMsg });
            }
        }
    }
};
//# sourceMappingURL=ask.js.map