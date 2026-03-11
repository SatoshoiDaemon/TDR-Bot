import {
    Guild,
    TextChannel,
    VoiceChannel,
    CategoryChannel,
    User,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} from 'discord.js';
import { randomUUID } from 'crypto';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { createTranscript } from 'discord-html-transcripts';
import { ConfigService } from '@services/configService.js';
import type { TicketYamlConfig } from '@shared/config/yamlLoader.js';

/**
 * Serviço de Tickets
 * Gerencia abertura, fechamento e ações de tickets
 */
export class TicketService {
    private static readonly FILENAME = 'tickets.yml';

    /**
     * Obtém configuração de tickets do YAML
     * Retorna um objeto compatível com o formato antigo (DB) para manter compatibilidade
     */
    static async getConfig(guildId: string): Promise<any> {
        const yamlConfig = ConfigService.getConfig<TicketYamlConfig>(this.FILENAME);

        // Buscar painéis do DB (continuam no Prisma)
        const panels = await prisma.ticketPanel.findMany({ where: { guildId } });

        // Retornar formato compatível com o antigo
        return {
            guildId,
            staffRoleIds: yamlConfig.staff_role_ids || [],
            logsChannelId: yamlConfig.transcript_channel_id || null,
            ratingChannelId: null, // Não existe no YAML por enquanto
            defaultCategoryId: yamlConfig.category_id || null,
            color: null,
            panels
        };
    }

    /**
     * Atualiza configuração de tickets no YAML
     */
    static async updateConfig(guildId: string, data: {
        staffRoleIds?: string[];
        logsChannelId?: string;
        ratingChannelId?: string;
        defaultCategoryId?: string;
        color?: string;
    }) {
        if (data.staffRoleIds !== undefined) {
            ConfigService.updateField(this.FILENAME, 'staff_role_ids', data.staffRoleIds, true);
        }
        if (data.logsChannelId !== undefined) {
            ConfigService.updateField(this.FILENAME, 'transcript_channel_id', data.logsChannelId, true);
        }
        if (data.defaultCategoryId !== undefined) {
            ConfigService.updateField(this.FILENAME, 'category_id', data.defaultCategoryId, true);
        }
        logger.info(`[TicketService] Configuração de tickets atualizada via YAML para guild ${guildId}`);
        return this.getConfig(guildId);
    }

    /**
     * Abre um novo ticket
     */
    static async openTicket(
        guild: Guild,
        user: User,
        panelId: string,
        optionId?: string,
        subject?: string,
        description?: string
    ) {
        const config = await this.getConfig(guild.id);
        if (!config) throw new Error('Sistema de tickets não configurado');

        const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
        if (!panel) throw new Error('Painel de tickets não encontrado');

        // Verificar se usuário já tem ticket aberto
        const existingTicket = await prisma.ticket.findFirst({
            where: { guildId: guild.id, userId: user.id, status: 'open' }
        });
        if (existingTicket) {
            return { existing: true, channelId: existingTicket.channelId };
        }

        // Verificar se a configuração está completa
        if (!config.defaultCategoryId) {
            throw new Error('Categoria padrão não configurada. Peça a um administrador para configurar o sistema de tickets.');
        }

        // Determinar categoria do ticket
        let categoryId = config.defaultCategoryId;
        if (optionId && panel.options) {
            const options = panel.options as any[];
            const selectedOption = options.find((o: any) => o.id === optionId);
            if (selectedOption?.categoryId) {
                categoryId = selectedOption.categoryId;
            }
        }

        const category = guild.channels.cache.get(categoryId) as CategoryChannel;
        if (!category) throw new Error('Categoria de tickets não encontrada');

        // Check staff role
        if (!config.staffRoleIds || config.staffRoleIds.length === 0) {
            throw new Error('Cargos de staff não configurados. Peça a um administrador para configurar o sistema de tickets.');
        }

        // Prepare permissions
        const overwrites: any[] = [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.AddReactions,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        // Add staff roles permissions
        if (config.staffRoleIds) {
            for (const roleId of config.staffRoleIds) {
                overwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                        PermissionsBitField.Flags.AddReactions,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                });
            }
        }

        // Criar canal do ticket
        const cleanUsername = user.username.toLowerCase().replace(/[\s._]/g, '-');
        const channel = await guild.channels.create({
            name: `🎫-${cleanUsername}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: `Ticket de ${user.tag} | ID: ${user.id}`,
            permissionOverwrites: overwrites
        });


        // Criar registro do ticket
        const ticket = await prisma.ticket.create({
            data: {
                channelId: channel.id,
                guildId: guild.id,
                panelId,
                userId: user.id,
                optionId,
                subject,
                description
            }
        });

        // Enviar mensagem inicial no ticket
        const embed = new EmbedBuilder()
            .setColor(config.color as any || EMBED_COLORS.PRIMARY)
            .setTitle('🎫 Ticket Aberto')
            .setDescription(
                `Olá ${user}, bem-vindo ao seu ticket!\n\n` +
                `📝 **Assunto:** ${subject || 'Não informado'}\n` +
                `📄 **Descrição:** ${description || 'Não informada'}\n\n` +
                `⏰ **Aberto em:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
                `👤 **Atendido por:** Aguardando staff...`
            )
            .setFooter({ text: `ID: ${ticket.id} | ${EMBED_CREDIT}` })
            .setTimestamp();

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_leave')
                .setLabel('Sair do Ticket')
                .setEmoji('🚪')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_member_panel')
                .setLabel('Painel Membro')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_staff_panel')
                .setLabel('Painel Staff')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('Assumir')
                .setEmoji('✋')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Fechar')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${user}`, embeds: [embed], components: [buttons] });

        // Log no canal de logs
        if (config.logsChannelId) {
            const logsChannel = guild.channels.cache.get(config.logsChannelId) as TextChannel;
            if (logsChannel) {
                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(EMBED_COLORS.SUCCESS)
                            .setDescription(`🎫 **Ticket aberto** por ${user} | [Ir para o ticket](${channel.url})`)
                            .setTimestamp()
                    ]
                });
            }
        }

        logger.info(`[Ticket] Ticket ${ticket.id} aberto por ${user.tag}`);
        return { existing: false, channelId: channel.id, ticketId: ticket.id };
    }

    /**
     * Staff assume o ticket
     */
    static async claimTicket(ticketId: string, staffId: string, guild: Guild) {
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { staffId }
        });

        const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
        const staff = await guild.members.fetch(staffId);
        const user = await guild.client.users.fetch(ticket.userId);

        // Notificar no canal
        await channel?.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLORS.SUCCESS)
                    .setDescription(`✋ Ticket assumido por ${staff}!`)
            ]
        });

        // Notificar usuário na DM
        try {
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLORS.INFO)
                        .setTitle('🎫 Ticket Assumido')
                        .setDescription(`O staff **${staff.displayName}** assumiu seu ticket!`)
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setLabel('Ir para o Ticket')
                            .setStyle(ButtonStyle.Link)
                            .setURL(channel.url)
                    )
                ]
            });
        } catch {
            // DM fechada
        }

        return ticket;
    }

    /**
     * Fecha o ticket
     */
    static async closeTicket(
        ticketId: string,
        closedBy: string,
        guild: Guild,
        reason?: string
    ) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket não encontrado');

        const config = await this.getConfig(guild.id);
        const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;

        // Gerar transcript
        let transcriptUrl: string | undefined;
        if (channel && config?.logsChannelId) {
            try {
                const transcript = await createTranscript(channel as any, {
                    filename: `transcript-${ticket.id}.html`
                });

                const logsChannel = guild.channels.cache.get(config.logsChannelId) as TextChannel;
                if (logsChannel) {
                    const user = await guild.client.users.fetch(ticket.userId).catch(() => null);
                    const closer = await guild.client.users.fetch(closedBy).catch(() => null);
                    const staff = ticket.staffId ? await guild.client.users.fetch(ticket.staffId).catch(() => null) : null;

                    const logEmbed = new EmbedBuilder()
                        .setColor(EMBED_COLORS.ERROR)
                        .setTitle('📋 Ticket Fechado')
                        .addFields(
                            { name: '👤 Aberto por', value: user?.tag || ticket.userId, inline: true },
                            { name: '🔒 Fechado por', value: closer?.tag || closedBy, inline: true },
                            { name: '🛡️ Staff', value: staff?.tag || 'Nenhum', inline: true },
                            { name: '📝 Motivo', value: reason || 'Não informado', inline: false },
                            { name: '⏰ Abertura', value: `<t:${Math.floor(ticket.openedAt.getTime() / 1000)}:f>`, inline: true },
                            { name: '⏰ Fechamento', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
                        )
                        .setTimestamp();

                    const msg = await logsChannel.send({ embeds: [logEmbed], files: [transcript] });
                    transcriptUrl = msg.url;
                }
            } catch (err) {
                logger.error('[Ticket] Erro ao gerar transcript:', err);
            }
        }

        // Atualizar ticket no banco
        await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'closed',
                closeReason: reason,
                closedBy,
                closedAt: new Date()
            }
        });

        // Notificar usuário na DM com botão de avaliação
        try {
            const user = await guild.client.users.fetch(ticket.userId);
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLORS.WARNING)
                        .setTitle('🎫 Seu Ticket foi Fechado')
                        .setDescription(
                            `Seu ticket foi encerrado.\n\n` +
                            `📝 **Motivo:** ${reason || 'Não informado'}\n` +
                            `⏰ **Fechado em:** <t:${Math.floor(Date.now() / 1000)}:f>`
                        )
                        .setTimestamp()
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket_rate_${ticketId}`)
                            .setLabel('Avaliar Atendimento')
                            .setEmoji('⭐')
                            .setStyle(ButtonStyle.Primary)
                    )
                ]
            });
        } catch {
            // DM fechada
        }

        // Deletar canal após delay
        if (channel) {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLORS.ERROR)
                        .setDescription('🔒 Este ticket foi fechado e será deletado em 5 segundos.')
                ]
            });
            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (err) {
                    logger.error(`[Ticket] Erro ao deletar canal do ticket ${ticketId}:`, err);
                }
            }, 5000);
        }

        // Deletar canal de voz se existir
        if (ticket.voiceChannelId) {
            const voiceChannel = guild.channels.cache.get(ticket.voiceChannelId);
            if (voiceChannel) {
                try {
                    await voiceChannel.delete();
                } catch {
                    // Canal já deletado
                }
            }
        }

        logger.info(`[Ticket] Ticket ${ticketId} fechado por ${closedBy}`);
        return { transcriptUrl };
    }

    /**
     * Adiciona usuário ao ticket
     */
    static async addUser(ticketId: string, userId: string, guild: Guild) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket não encontrado');

        const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
        if (!channel) throw new Error('Canal do ticket não encontrado');

        // Atualizar permissões
        await channel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true,
            AddReactions: true,
            ReadMessageHistory: true
        });

        // Atualizar banco
        const currentUsers = ticket.addedUsers || [];
        if (!currentUsers.includes(userId)) {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: { addedUsers: [...currentUsers, userId] }
            });
        }

        const user = await guild.client.users.fetch(userId);
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLORS.SUCCESS)
                    .setDescription(`➕ ${user} foi adicionado ao ticket.`)
            ]
        });

        return ticket;
    }

    /**
     * Remove usuário do ticket
     */
    static async removeUser(ticketId: string, userId: string, guild: Guild) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket não encontrado');
        if (userId === ticket.userId) throw new Error('Não é possível remover o dono do ticket');

        const channel = guild.channels.cache.get(ticket.channelId) as TextChannel;
        if (!channel) throw new Error('Canal do ticket não encontrado');

        // Remover permissões
        await channel.permissionOverwrites.delete(userId);

        // Atualizar banco
        const currentUsers = ticket.addedUsers || [];
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { addedUsers: currentUsers.filter((id: string) => id !== userId) }
        });

        const user = await guild.client.users.fetch(userId);
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setDescription(`➖ ${user} foi removido do ticket.`)
            ]
        });

        return ticket;
    }

    /**
     * Cria canal de voz para o ticket
     */
    static async createVoiceChannel(ticketId: string, guild: Guild) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket não encontrado');
        if (ticket.voiceChannelId) throw new Error('Já existe um canal de voz para este ticket');

        const config = await this.getConfig(guild.id);
        if (!config) throw new Error('Configuração não encontrada');

        const textChannel = guild.channels.cache.get(ticket.channelId) as TextChannel;
        const user = await guild.client.users.fetch(ticket.userId);

        // Permissões base
        const permissionOverwrites: any[] = [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: ticket.userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
            },
        ];

        // Add staff roles permissions
        if (config.staffRoleIds) {
            for (const roleId of config.staffRoleIds) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                });
            }
        }

        // Adicionar usuários extras
        for (const userId of ticket.addedUsers || []) {
            permissionOverwrites.push({
                id: userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
            });
        }

        const voiceChannel = await guild.channels.create({
            name: `📞-${user.username}`,
            type: ChannelType.GuildVoice,
            parent: textChannel?.parentId || undefined,
            permissionOverwrites
        });

        await prisma.ticket.update({
            where: { id: ticketId },
            data: { voiceChannelId: voiceChannel.id }
        });

        return voiceChannel;
    }

    /**
     * Deleta canal de voz do ticket
     */
    static async deleteVoiceChannel(ticketId: string, guild: Guild) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket?.voiceChannelId) throw new Error('Não há canal de voz para este ticket');

        const voiceChannel = guild.channels.cache.get(ticket.voiceChannelId);
        if (voiceChannel) {
            await voiceChannel.delete();
        }

        await prisma.ticket.update({
            where: { id: ticketId },
            data: { voiceChannelId: null }
        });
    }

    /**
     * Processa avaliação do ticket
     */
    static async submitRating(ticketId: string, rating: number, comment: string | null) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket não encontrado');

        return prisma.ticketRating.create({
            data: {
                ticketId,
                guildId: ticket.guildId,
                userId: ticket.userId,
                staffId: ticket.staffId,
                rating,
                comment
            }
        });
    }

    /**
     * Obtém ticket pelo ID do canal
     */
    static async getByChannelId(channelId: string) {
        return prisma.ticket.findUnique({ where: { channelId } });
    }

    /**
     * Obtém ticket pelo ID
     */
    static async getById(ticketId: string) {
        return prisma.ticket.findUnique({ where: { id: ticketId } });
    }
    /**
     * Atualiza o ID da mensagem do painel
     */
    static async updatePanelMessageId(panelId: string, messageId: string) {
        return prisma.ticketPanel.update({
            where: { id: panelId },
            data: { messageId }
        });
    }
    /**
     * Cria e envia um painel de tickets
     */
    static async createPanel(guildId: string, data: {
        channelId: string;
        title: string;
        description: string;
        type: 'button' | 'select';
        placeholder?: string; // For select menu
        options: Array<{
            label: string;
            emoji?: string;
            style?: ButtonStyle; // For buttons
            description?: string; // For select options
            categoryId?: string;
        }>;
    }) {
        const config = await this.getConfig(guildId);
        if (!config) throw new Error('Configuração não encontrada');

        // Prepare options with IDs
        const formattedOptions = data.options.map(opt => ({
            id: randomUUID(),
            label: opt.label,
            emoji: opt.emoji,
            style: opt.style || ButtonStyle.Primary,
            description: opt.description,
            categoryId: opt.categoryId || config.defaultCategoryId
        }));

        // Create panel in DB
        const panel = await prisma.ticketPanel.create({
            data: {
                guildId,
                title: data.title,
                description: data.description,
                channelId: data.channelId,
                type: data.type,
                options: formattedOptions as any // Json
            }
        });

        return panel;
    }
}
