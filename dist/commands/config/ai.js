/**
 * Config Module: IA (Igris)
 * Configurações SEGURAS da IA - exclui security, rate_limit, key_management
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { logger } from '../../shared/logger.js';
import { createConfigEmbed, createBackButton, createToggleButton, createSubcategoryMenu, createMultiFieldModal, updateConfigField, successMessage, errorMessage, safeRespond } from './shared.js';
const FILENAME = 'ai.yml';
/**
 * Menu principal de IA
 */
export async function showAIMenu(interaction, backHandler) {
    try {
        const config = ConfigService.getConfig(FILENAME);
        const embed = createConfigEmbed('Configurações da IA (Igris)', '🤖', 'Configure o assistente de IA do servidor.\n\n' +
            '⚠️ *Configurações de segurança e rate-limit não são editáveis aqui.*\n\n' +
            '**📊 Status Atual:**');
        const ai = config.ai || { enabled: true, model: 'gemini-flash-latest', temperature: 0.2 };
        const responses = config.responses || { embed_responses: true };
        const mentions = config.mentions || { respond_to_mentions: true };
        embed.addFields({ name: '📊 Status', value: ai.enabled ? '✅ Ativa' : '❌ Inativa', inline: true }, { name: '🤖 Modelo', value: ai.model || 'Padrão', inline: true }, { name: '🌡️ Temperatura', value: `${ai.temperature}`, inline: true }, { name: '🖼️ Embeds', value: responses.embed_responses ? '✅' : '❌', inline: true }, { name: '📢 Menções', value: mentions.respond_to_mentions ? '✅' : '❌', inline: true }, { name: '↩️ Respostas', value: mentions.respond_to_replies ? '✅' : '❌', inline: true });
        const menu = createSubcategoryMenu('config_ai_submenu', 'Selecione uma subcategoria...', [
            { label: 'Configurações Gerais', value: 'general', description: 'Ativar/desativar, modelo, temperatura', emoji: '⚙️' },
            { label: 'Respostas', value: 'responses', description: 'Embeds, menções, formato', emoji: '💬' },
            { label: 'Memória', value: 'memory', description: 'Curto, médio e longo prazo', emoji: '🧠' },
            { label: 'Functions', value: 'functions', description: 'Habilitar/desabilitar funções', emoji: '🔧' }
        ]);
        const backRow = new ActionRowBuilder().addComponents(createBackButton('config_back_to_main'));
        await safeRespond(interaction, { embeds: [embed], components: [menu, backRow] });
    }
    catch (error) {
        logger.error('[ConfigAI] Erro em showAIMenu:', error);
    }
}
/**
 * Handler Central para Interações de IA
 */
export async function handleAIInteraction(interaction) {
    const customId = interaction.customId;
    try {
        // Submenu navigation
        if (customId === 'config_ai_submenu' && interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            switch (choice) {
                case 'general':
                    await showAIGeneralConfig(interaction);
                    break;
                case 'responses':
                    await showAIResponsesConfig(interaction);
                    break;
                case 'memory':
                    await showAIMemoryConfig(interaction);
                    break;
                case 'functions':
                    await showAIFunctionsConfig(interaction);
                    break;
            }
            return;
        }
        // General Config
        if (customId === 'config_ai_general_back')
            return await showAIMenu(interaction);
        if (customId === 'config_ai_toggle') {
            await toggleAI(interaction);
            return;
        }
        if (customId === 'config_ai_model_select') {
            await handleModelSelect(interaction);
            return;
        }
        if (customId === 'config_ai_general_edit') {
            await showGeneralEditModal(interaction);
            return;
        }
        if (customId === 'config_ai_general_modal') {
            await handleGeneralEditModal(interaction);
            return;
        }
        // Responses Config
        if (customId === 'config_ai_responses_back')
            return await showAIMenu(interaction);
        if (['config_ai_embed_toggle', 'config_ai_mention_toggle', 'config_ai_typing_toggle', 'config_ai_respond_mentions', 'config_ai_respond_replies'].includes(customId)) {
            await toggleResponseOption(interaction);
            return;
        }
        // Memory Config
        if (customId === 'config_ai_memory_back')
            return await showAIMenu(interaction);
        if (['config_ai_mem_short', 'config_ai_mem_medium', 'config_ai_mem_long'].includes(customId)) {
            await toggleMemoryOption(interaction);
            return;
        }
        // Functions Config
        if (customId === 'config_ai_functions_back')
            return await showAIMenu(interaction);
        if (customId === 'config_ai_functions_toggle') {
            await toggleFunctions(interaction);
            return;
        }
    }
    catch (error) {
        logger.error(`[ConfigAI] Erro ao processar interação ${customId}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar comando.', flags: MessageFlags.Ephemeral });
        }
    }
}
// =========================================
// General Implementation
// =========================================
async function showAIGeneralConfig(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const ai = config.ai || { enabled: true, model: 'gemini-flash-latest', temperature: 0.2, max_tokens: 2048 };
    const embed = createConfigEmbed('Configurações Gerais da IA', '⚙️', 'Configure os parâmetros principais do modelo de IA.');
    embed.addFields({ name: '📊 Status', value: ai.enabled ? '✅ Ativa' : '❌ Inativa', inline: true }, { name: '🤖 Modelo', value: ai.model, inline: true }, { name: '🌡️ Temperatura', value: `${ai.temperature} (0 = preciso, 2 = criativo)`, inline: false }, { name: '📝 Max Tokens', value: `${ai.max_tokens}`, inline: true });
    const modelOptions = [
        { label: 'Gemini Flash', value: 'gemini-flash-latest', description: 'Rápido e econômico' },
        { label: 'Gemini Pro', value: 'gemini-pro', description: 'Balanceado' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', description: 'Mais capaz' }
    ];
    const modelMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('config_ai_model_select')
        .setPlaceholder(`Modelo atual: ${ai.model}`)
        .addOptions(modelOptions));
    const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_ai_toggle', ai.enabled), new ButtonBuilder()
        .setCustomId('config_ai_general_edit')
        .setLabel('Editar Parâmetros')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✏️'), createBackButton('config_ai_general_back'));
    await safeRespond(interaction, { embeds: [embed], components: [modelMenu, buttons] });
}
async function toggleAI(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const enabled = config.ai?.enabled ?? true;
    await updateConfigField(FILENAME, 'ai.enabled', !enabled, interaction.user.id);
    await showAIGeneralConfig(interaction);
}
async function handleModelSelect(interaction) {
    const newModel = interaction.values[0];
    const result = await updateConfigField(FILENAME, 'ai.model', newModel, interaction.user.id);
    if (result.success) {
        await interaction.reply({ content: successMessage(`Modelo alterado para ${newModel}`), flags: MessageFlags.Ephemeral });
    }
    else {
        await interaction.reply({ content: errorMessage(result.error || 'Erro'), flags: MessageFlags.Ephemeral });
    }
    // Pequeno delay para ler a mensagem antes de atualizar o menu
    // Mas como o menu é a base, idealmente atualizariamos o menu.
    // Como ephemeral não bloqueia, podemos chamar o menu novamente se quisermos atualizar o placeholder
    // Mas o usuário tem que fechar o ephemeral.
    // Vamos apenas atualizar o menu principal silenciosamente se possível, mas não é fácil sem a ref do menu.
}
async function showGeneralEditModal(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const ai = config.ai || { temperature: 0.2, max_tokens: 2048 };
    const modal = createMultiFieldModal('config_ai_general_modal', 'Editar IA', [
        { id: 'temperature', label: 'Temperatura (0-2)', value: String(ai.temperature), placeholder: 'Ex: 0.7' },
        { id: 'max_tokens', label: 'Max Tokens (100-8192)', value: String(ai.max_tokens), placeholder: 'Ex: 2048' }
    ]);
    await interaction.showModal(modal);
}
async function handleGeneralEditModal(interaction) {
    const temperature = parseFloat(interaction.fields.getTextInputValue('temperature'));
    const maxTokens = parseInt(interaction.fields.getTextInputValue('max_tokens'));
    let errors = [];
    const r1 = await updateConfigField(FILENAME, 'ai.temperature', temperature, interaction.user.id);
    if (!r1.success)
        errors.push(`Temperatura: ${r1.error}`);
    const r2 = await updateConfigField(FILENAME, 'ai.max_tokens', maxTokens, interaction.user.id);
    if (!r2.success)
        errors.push(`Max Tokens: ${r2.error}`);
    if (errors.length > 0) {
        await interaction.reply({ content: errorMessage(`Erros:\n${errors.join('\n')}`), flags: MessageFlags.Ephemeral });
    }
    else {
        await interaction.reply({ content: successMessage('Parâmetros atualizados!'), flags: MessageFlags.Ephemeral });
    }
}
// =========================================
// Responses Implementation
// =========================================
async function showAIResponsesConfig(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const responses = config.responses || {};
    const mentions = config.mentions || {};
    const embed = createConfigEmbed('Configurações de Respostas', '💬', 'Configure como a IA responde às mensagens.');
    embed.addFields({ name: '🖼️ Usar Embeds', value: responses.embed_responses ? '✅' : '❌', inline: true }, { name: '⌨️ Indicador de Digitação', value: responses.typing_indicator ? '✅' : '❌', inline: true }, { name: '📢 Mencionar Usuário', value: responses.mention_user ? '✅' : '❌', inline: true }, { name: '📩 Responder Menções', value: mentions.respond_to_mentions ? '✅' : '❌', inline: true }, { name: '↩️ Responder Replies', value: mentions.respond_to_replies ? '✅' : '❌', inline: true }, { name: '🎨 Cor do Embed', value: responses.embed_color || '#5865F2', inline: true });
    const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_ai_embed_toggle', responses.embed_responses, 'Desativar Embed', 'Ativar Embed'), createToggleButton('config_ai_mention_toggle', responses.mention_user, 'Sem Menção', 'Com Menção'), createToggleButton('config_ai_typing_toggle', responses.typing_indicator, 'Sem Digitação', 'Com Digitação'), createBackButton('config_ai_responses_back'));
    const buttons2 = new ActionRowBuilder().addComponents(createToggleButton('config_ai_respond_mentions', mentions.respond_to_mentions, 'Ignorar Menções', 'Responder Menções'), createToggleButton('config_ai_respond_replies', mentions.respond_to_replies, 'Ignorar Replies', 'Responder Replies'));
    await safeRespond(interaction, { embeds: [embed], components: [buttons, buttons2] });
}
async function toggleResponseOption(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const responses = config.responses || {};
    const mentions = config.mentions || {};
    const toggleMap = {
        'config_ai_embed_toggle': ['responses.embed_responses', !responses.embed_responses],
        'config_ai_mention_toggle': ['responses.mention_user', !responses.mention_user],
        'config_ai_typing_toggle': ['responses.typing_indicator', !responses.typing_indicator],
        'config_ai_respond_mentions': ['mentions.respond_to_mentions', !mentions.respond_to_mentions],
        'config_ai_respond_replies': ['mentions.respond_to_replies', !mentions.respond_to_replies]
    };
    if (toggleMap[interaction.customId]) {
        const [path, value] = toggleMap[interaction.customId];
        await updateConfigField(FILENAME, path, value, interaction.user.id);
        await showAIResponsesConfig(interaction);
    }
}
// =========================================
// Memory Implementation
// =========================================
async function showAIMemoryConfig(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const memory = config.memory || {};
    const embed = createConfigEmbed('Configurações de Memória', '🧠', 'Configure os níveis de memória da IA.');
    const shortTerm = memory.short_term || { enabled: true, max_messages: 10 };
    const mediumTerm = memory.medium_term || { enabled: true };
    const longTerm = memory.long_term || { enabled: true };
    embed.addFields({ name: '⚡ Curto Prazo', value: shortTerm.enabled ? `✅ (${shortTerm.max_messages} msgs)` : '❌', inline: true }, { name: '📅 Médio Prazo', value: mediumTerm.enabled ? '✅' : '❌', inline: true }, { name: '📚 Longo Prazo', value: longTerm.enabled ? '✅' : '❌', inline: true });
    const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_ai_mem_short', shortTerm.enabled, 'Desativar Curto', 'Ativar Curto'), createToggleButton('config_ai_mem_medium', mediumTerm.enabled, 'Desativar Médio', 'Ativar Médio'), createToggleButton('config_ai_mem_long', longTerm.enabled, 'Desativar Longo', 'Ativar Longo'), createBackButton('config_ai_memory_back'));
    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}
async function toggleMemoryOption(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const memory = config.memory || {};
    const shortTerm = memory.short_term || { enabled: true };
    const mediumTerm = memory.medium_term || { enabled: true };
    const longTerm = memory.long_term || { enabled: true };
    const toggleMap = {
        'config_ai_mem_short': ['memory.short_term.enabled', !shortTerm.enabled],
        'config_ai_mem_medium': ['memory.medium_term.enabled', !mediumTerm.enabled],
        'config_ai_mem_long': ['memory.long_term.enabled', !longTerm.enabled]
    };
    if (toggleMap[interaction.customId]) {
        const [path, value] = toggleMap[interaction.customId];
        await updateConfigField(FILENAME, path, value, interaction.user.id);
        await showAIMemoryConfig(interaction);
    }
}
// =========================================
// Functions Implementation
// =========================================
async function showAIFunctionsConfig(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const functions = config.functions || { enabled: true };
    const embed = createConfigEmbed('Configurações de Functions', '🔧', 'Configure as funções que a IA pode executar.');
    embed.addFields({ name: '📊 Status', value: functions.enabled ? '✅ Functions Ativas' : '❌ Functions Inativas', inline: false });
    if (functions.available_functions) {
        const funcsText = functions.available_functions
            .map(f => `${f.enabled ? '✅' : '❌'} **${f.name}** - ${f.description}`)
            .join('\n');
        embed.addFields({ name: '📋 Funções Disponíveis', value: funcsText.substring(0, 1024), inline: false });
    }
    embed.setFooter({ text: 'Para editar funções individuais, modifique ai.yml diretamente.' });
    const buttons = new ActionRowBuilder().addComponents(createToggleButton('config_ai_functions_toggle', functions.enabled, 'Desativar Functions', 'Ativar Functions'), createBackButton('config_ai_functions_back'));
    await safeRespond(interaction, { embeds: [embed], components: [buttons] });
}
async function toggleFunctions(interaction) {
    const config = ConfigService.getConfig(FILENAME);
    const enabled = config.functions?.enabled ?? true;
    await updateConfigField(FILENAME, 'functions.enabled', !enabled, interaction.user.id);
    await showAIFunctionsConfig(interaction);
}
//# sourceMappingURL=ai.js.map