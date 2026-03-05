import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
import { showEconomyMenu } from '../commands/config/economy.js';
import { showLevelingMenu } from '../commands/config/leveling.js';
import { showAIMenu } from '../commands/config/ai.js';
/**
 * Handler centralizado para interações de configuração
 */
export class ConfigInteractionHandler {
    /**
     * Processa interações de configuração (botões, menus, modais)
     */
    static async handle(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit() && !interaction.isRoleSelectMenu?.() && !interaction.isUserSelectMenu?.() && !interaction.isChannelSelectMenu?.())
            return false;
        const customId = interaction.customId;
        const configPrefixes = ['config_', 'wizard_', 'confirm_panel', 'cancel_panel', 'cancel_ticket_config', 'ticket_set_'];
        const isConfigAction = configPrefixes.some(prefix => customId.startsWith(prefix));
        if (!isConfigAction)
            return false;
        // Verificar permissões (Admin apenas)
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            if (interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Você não tem permissão para configurar o bot.', flags: MessageFlags.Ephemeral });
            }
            return true;
        }
        try {
            // Roteamento
            if (customId === 'config_main_menu') {
                await this.handleMainMenu(interaction);
                return true;
            }
            if (customId === 'config_back_to_main') {
                await this.showMainMenu(interaction);
                return true;
            }
            // Sub-handlers específicos
            // Nota: Os arquivos de categoria ainda precisam ser refatorados para exportar handlers compatíveis
            // Por enquanto, vamos manter a compatibilidade com a estrutura existente onde possível
            // Mas o ideal é que esses métodos sejam movidos para cá ou chamados de forma padronizada
            // Economy
            if (customId.startsWith('config_economy_')) {
                const { handleEconomyInteraction } = await import('../commands/config/economy.js');
                await handleEconomyInteraction(interaction);
                return true;
            }
            // Leveling
            if (customId.startsWith('config_leveling_')) {
                const { handleLevelingInteraction } = await import('../commands/config/leveling.js');
                await handleLevelingInteraction(interaction);
                return true;
            }
            // AI
            if (customId.startsWith('config_ai_')) {
                const { handleAIInteraction } = await import('../commands/config/ai.js');
                await handleAIInteraction(interaction);
                return true;
            }
            // Welcome
            if (customId.startsWith('config_welcome_')) {
                const { handleWelcomeInteraction } = await import('../commands/config/welcome.js');
                await handleWelcomeInteraction(interaction);
                return true;
            }
            // Tickets
            if (customId.startsWith('config_ticket_') || customId.startsWith('wizard_') || customId.startsWith('ticket_set_') || customId === 'confirm_panel' || customId === 'cancel_panel' || customId === 'cancel_ticket_config') {
                const { handleTicketInteraction } = await import('../commands/config/tickets.js');
                await handleTicketInteraction(interaction);
                return true;
            }
            // Events
            if (customId.startsWith('config_events_')) {
                const { handleEventsInteraction } = await import('../commands/config/events.js');
                await handleEventsInteraction(interaction);
                return true;
            }
            // Inactivity
            if (customId.startsWith('config_inactivity_')) {
                const { handleInactivityInteraction } = await import('../commands/config/inactivity.js');
                await handleInactivityInteraction(interaction);
                return true;
            }
            // Profile
            if (customId.startsWith('config_profile_')) {
                const { handleProfileInteraction } = await import('../commands/config/profile.js');
                await handleProfileInteraction(interaction);
                return true;
            }
            // Quests
            if (customId.startsWith('config_quests_')) {
                const { handleQuestsInteraction } = await import('../commands/config/quests.js');
                await handleQuestsInteraction(interaction);
                return true;
            }
            // Permissions
            if (customId.startsWith('config_perms_')) {
                const { handlePermissionsInteraction } = await import('../commands/config/permissions.js');
                await handlePermissionsInteraction(interaction);
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('[ConfigHandler] Erro ao processar interação:', error);
            if (interaction.isRepliable() && !interaction.replied) {
                await interaction.reply({ content: '❌ Erro ao processar configuração.', flags: MessageFlags.Ephemeral });
            }
            return true;
        }
    }
    /**
     * Exibe o menu principal de configurações
     */
    static async showMainMenu(interaction) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.INFO)
            .setTitle('⚙️ Central de Configurações — ArgosBot')
            .setDescription('Bem-vindo ao painel de controle. Selecione uma categoria abaixo para configurar os sistemas do bot.\n\n' +
            '**🔷 Sistemas Core**\n' +
            '└ Economia, Leveling, IA\n\n' +
            '**🔷 Social & Eventos**\n' +
            '└ Boas-vindas, Tickets')
            .setFooter({ text: EMBED_CREDIT });
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
            .setCustomId('config_main_menu')
            .setPlaceholder('Escolha uma categoria...')
            .addOptions([
            { label: 'Economia', value: 'economy', emoji: '💰', description: 'Daily, Roubo, Apostas, Coleta' },
            { label: 'Leveling', value: 'leveling', emoji: '✨', description: 'XP, Níveis, Recompensas' },
            { label: 'IA (Igris)', value: 'ai', emoji: '🤖', description: 'Modelo, Respostas, Memória' },
            { label: 'Boas-vindas', value: 'welcome', emoji: '👋', description: 'Mensagens, Cargos iniciais' },
            { label: 'Tickets', value: 'tickets', emoji: '🎫', description: 'Suporte e Atendimento' },
            { label: 'Eventos', value: 'events', emoji: '🎉', description: 'Double XP, Shop, Eventos Aleatórios' },
            { label: 'Inatividade', value: 'inactivity', emoji: '💤', description: 'Monitoramento de inatividade' },
            { label: 'Perfil', value: 'profile', emoji: '👤', description: 'Padrões de perfil e cargos' },
            { label: 'Missões', value: 'quests', emoji: '📜', description: 'Daily Quests e Recompensas' },
            { label: 'Permissões', value: 'permissions', emoji: '🛡️', description: 'Acesso a comandos de staff' }
        ]));
        if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            await interaction.update({ embeds: [embed], components: [menu] });
        }
        else if (interaction.isChatInputCommand()) {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed], components: [menu] });
            }
            else {
                await interaction.reply({ embeds: [embed], components: [menu], flags: MessageFlags.Ephemeral });
            }
        }
    }
    /**
     * Handler do menu principal (select menu)
     */
    static async handleMainMenu(interaction) {
        const category = interaction.values[0];
        const backToMain = (i) => this.showMainMenu(i);
        switch (category) {
            case 'economy':
                await showEconomyMenu(interaction, backToMain);
                break;
            case 'leveling':
                await showLevelingMenu(interaction, backToMain);
                break;
            case 'ai':
                await showAIMenu(interaction, backToMain);
                break;
            case 'welcome':
                const { showWelcomeMenu } = await import('../commands/config/welcome.js');
                await showWelcomeMenu(interaction, backToMain);
                break;
            case 'tickets':
                const { showTicketMenu } = await import('../commands/config/tickets.js');
                await showTicketMenu(interaction, backToMain);
                break;
            case 'events':
                const { showEventsMenu } = await import('../commands/config/events.js');
                await showEventsMenu(interaction, backToMain);
                break;
            case 'inactivity':
                const { showInactivityMenu } = await import('../commands/config/inactivity.js');
                await showInactivityMenu(interaction, backToMain);
                break;
            case 'profile':
                const { showProfileMenu } = await import('../commands/config/profile.js');
                await showProfileMenu(interaction, backToMain);
                break;
            case 'quests':
                const { showQuestsMenu } = await import('../commands/config/quests.js');
                await showQuestsMenu(interaction, backToMain);
                break;
            case 'permissions':
                const { showPermissionsMenu } = await import('../commands/config/permissions.js');
                await showPermissionsMenu(interaction, backToMain);
                break;
            default:
                await interaction.reply({ content: '⚠️ Categoria não implementada.', flags: MessageFlags.Ephemeral });
        }
    }
}
//# sourceMappingURL=configHandler.js.map