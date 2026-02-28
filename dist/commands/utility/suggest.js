import { SlashCommandBuilder, Message, MessageFlags } from 'discord.js';
import { SuggestionService } from '../../services/suggestionService.js';
import { appConfig } from '../../shared/config.js';
import { prisma } from '../../database/client.js';
import { logger } from '../../shared/logger.js';
export const suggestCommand = {
    name: 'suggest',
    description: 'Envia uma sugestão para o servidor',
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Envia uma sugestão para o servidor')
        .addStringOption(o => o.setName('conteudo').setDescription('O que você deseja sugerir?').setRequired(true)),
    async execute(interactionOrMessage, client) {
        const userId = interactionOrMessage instanceof Message ? interactionOrMessage.author.id : interactionOrMessage.user.id;
        const content = interactionOrMessage instanceof Message
            ? (interactionOrMessage.content.split(' ').slice(1).join(' '))
            : interactionOrMessage.options.getString('conteudo', true);
        if (!content || content.length < 10) {
            const msg = '❌ Sua sugestão deve ter pelo menos 10 caracteres.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(msg);
            return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        try {
            // Buscar configuração do canal de sugestões
            const config = await prisma.systemConfig.findUnique({ where: { key: 'suggestion_config' } });
            const suggestionConfig = config ? JSON.parse(config.value) : null;
            const channelId = suggestionConfig?.channelId || appConfig.discord.suggestionChannel;
            const webhookUrl = suggestionConfig?.webhookUrl;
            if (!channelId) {
                const msg = '❌ O sistema de sugestões não está configurado neste servidor.';
                if (interactionOrMessage instanceof Message)
                    return interactionOrMessage.reply(msg);
                return interactionOrMessage.reply({ content: msg, flags: MessageFlags.Ephemeral });
            }
            await SuggestionService.createSuggestion(client, userId, content, interactionOrMessage.guildId, channelId, webhookUrl);
            const successMsg = '✅ Sua sugestão foi enviada com sucesso e um tópico de discussão foi criado!';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(successMsg);
            return interactionOrMessage.reply({ content: successMsg, flags: MessageFlags.Ephemeral });
        }
        catch (error) {
            logger.error('Erro ao processar comando de sugestão:', error);
            const errorMsg = '❌ Ocorreu um erro ao enviar sua sugestão.';
            if (interactionOrMessage instanceof Message)
                return interactionOrMessage.reply(errorMsg);
            return interactionOrMessage.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=suggest.js.map