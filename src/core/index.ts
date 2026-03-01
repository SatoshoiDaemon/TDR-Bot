import {
  Client, Events, Collection, REST, Routes, EmbedBuilder, TextChannel,
  MessageFlags
} from 'discord.js';
import { appConfig } from '@shared/config.js';
import { connectDB, prisma } from '@database/client.js';
import { redis } from '@database/redis.js';
import { loadCommands } from './commandHandler.js';
import { logger } from '@shared/logger.js';
import { SnapshotScheduler } from '@scheduler/scheduler.js';
import { RoleScheduler } from '@scheduler/roleScheduler.js';
import { snapshotDb } from '@database/database.js';
import { ReminderScheduler } from '@scheduler/reminderScheduler.js';
import { InactivityScheduler } from '@scheduler/inactivityScheduler.js';
import { EventScheduler } from '@scheduler/eventScheduler.js';
import { AIKeyScheduler } from '@scheduler/aiKeyScheduler.js';
import { VoiceQuestScheduler } from '@scheduler/voiceQuestScheduler.js';
import { StarBoardScheduler } from '@scheduler/starBoardScheduler.js';
import { ChatMovementScheduler } from '@scheduler/chatMovementScheduler.js';
import { SuggestionService } from '@services/suggestionService.js';
import { FeedService } from '@services/feedService.js';
import { PartnershipService } from '@services/partnershipService.js';
import { BackupService } from '@services/backupService.js';
import { LevelService } from '@services/levelService.js';
import { levelingConfig } from '@shared/config/yamlLoader.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { TicketInteractionHandler } from '../handlers/ticketHandler.js';
import { MentionHandler } from '../handlers/mentionHandler.js';
import { DiceRoller } from '../utils/diceRoller.js';
import { RollService } from '../services/rollService.js';
import { EventService, EventType } from '@services/eventService.js';
import { QuestService, QuestType } from '../services/questService.js';

/**
 * Cliente Discord com intents necessários
 */
const client = new Client({
  intents: [
    'Guilds',
    'GuildMessages',
    'MessageContent',
    'GuildMembers',
    'GuildVoiceStates',
    'GuildMessageReactions'
  ]
});

import path from 'path';

const databasePath = path.join(process.cwd(), 'prisma', 'dev.db');

/**
 * Função principal de inicialização do bot
 * Conecta ao banco, carrega comandos e inicia schedulers
 */
async function bootstrap() {
  logger.info('🚀 Iniciando ArgosBot — Axiom.ts · TDR');

  // Conectar ao Redis e Banco
  try {
    await connectDB();
    logger.info('✅ Banco de dados conectado');

    await redis.set('argos:status', 'online');
    logger.info('✅ Conexão com Redis estabelecida');

    // Limpar cache de rank para garantir fórmula nova
    await LevelService.flushRankCache();
  } catch (err) {
    logger.error('❌ Erro na inicialização (DB/Redis):', err);
    process.exit(1);
  }

  // Carregar comandos
  let commands: any[];
  let commandCollection: Collection<string, any>;

  try {
    commands = await loadCommands();
    commandCollection = new Collection<string, any>();
    commands.forEach(cmd => commandCollection.set(cmd.name, cmd));
    logger.info(`✅ ${commands.length} comandos carregados`);
  } catch (err) {
    logger.error('❌ Erro ao carregar comandos:', err);
    process.exit(1);
  }

  /**
   * Evento: Bot conectado e pronto
   */
  client.once(Events.ClientReady, async (c) => {
    logger.info(`✅ Conectado como ${c.user.tag}`);

    // Registrar slash commands
    try {
      const rest = new REST({ version: '10' }).setToken(appConfig.discord.token);
      const slashCommands = commands.filter(cmd => cmd.data).map(cmd => cmd.data.toJSON());

      await rest.put(
        Routes.applicationGuildCommands(c.user.id, appConfig.discord.guildId),
        { body: slashCommands }
      );
      logger.info(`✅ ${slashCommands.length} slash commands registrados`);
    } catch (error) {
      logger.error('❌ Erro ao registrar slash commands:', error);
    }

    // Iniciar Snapshot Scheduler
    try {
      const scheduler = new SnapshotScheduler(client, snapshotDb, {
        guildId: appConfig.discord.guildId,
        backupGuildIds: appConfig.discord.backupGuildIds as any,
        systemCategory: appConfig.discord.systemCategory,
        snapshotHour: appConfig.discord.snapshotHour,
        webhookUrl: appConfig.backup.webhookUrl
      });
      scheduler.start();
      logger.info('✅ Snapshot Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Snapshot Scheduler:', err);
    }

    // Iniciar Reminder Scheduler
    try {
      const reminderScheduler = new ReminderScheduler(client);
      reminderScheduler.start();
      logger.info('✅ Reminder Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Reminder Scheduler:', err);
    }

    // Iniciar Inactivity Scheduler
    try {
      const inactivityScheduler = new InactivityScheduler(client);
      inactivityScheduler.start();
      logger.info('✅ Inactivity Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Inactivity Scheduler:', err);
    }

    // Iniciar Event Scheduler
    try {
      const eventScheduler = new EventScheduler(client);
      eventScheduler.start();
      logger.info('✅ Event Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Event Scheduler:', err);
    }

    // Iniciar AI Key Scheduler
    try {
      const aiKeyScheduler = new AIKeyScheduler(client);
      aiKeyScheduler.start();
      logger.info('✅ AI Key Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar AI Key Scheduler:', err);
    }

    // Iniciar Voice Quest Scheduler
    try {
      const voiceQuestScheduler = new VoiceQuestScheduler(client);
      voiceQuestScheduler.start();
      logger.info('✅ Voice Quest Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Voice Quest Scheduler:', err);
    }

    // Iniciar StarBoard Scheduler
    try {
      const starBoardScheduler = new StarBoardScheduler(client);
      starBoardScheduler.start();
      logger.info('✅ StarBoard Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar StarBoard Scheduler:', err);
    }

    // Iniciar Role Scheduler (Cargos Temporários)
    try {
      const roleScheduler = new RoleScheduler(client);
      roleScheduler.start();
      logger.info('✅ Role Scheduler iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Role Scheduler:', err);
    }

    // Iniciar Seed de Conhecimento (IA)
    try {
      const { KnowledgeSeedService } = await import('@services/knowledgeSeedService.js');
      KnowledgeSeedService.seedFromChannels(client, appConfig.discord.guildId)
        .then(() => logger.info('✅ Processo de Knowledge Seed iniciado'))
        .catch(err => logger.error('⚠️ Falha ao iniciar Knowledge Seed:', err));
    } catch (err) {
      logger.error('⚠️ Erro ao carregar Knowledge Seed Service:', err);
    }

    // Iniciar Auto Chat Movement
    try {
      const chatMovementScheduler = new ChatMovementScheduler(client, appConfig.discord.guildId);
      chatMovementScheduler.start();
      logger.info('✅ Auto Chat Movement iniciado');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Auto Chat Movement:', err);
    }

    // Iniciar Backup Service
    try {
      const snapshotDbPath = path.join(process.cwd(), 'snapshots.db');

      const backupService = new BackupService(
        snapshotDbPath,
        appConfig.backup.retentionDays
      );

      setInterval(() => {
        try {
          // Faz o backup automático e periódico de snapshots.db que guarda a arquitetura, chats e categorias do servidor (Backup de Server):
          backupService.createBackup(snapshotDbPath);
          backupService.cleanOldBackups();
        } catch (err) {
          logger.error('⚠️ Erro no backup automático:', err);
        }
      }, appConfig.backup.intervalHours * 3600000);

      logger.info('✅ Backup Service iniciado (Proteção do Snapshot agendada)');
    } catch (err) {
      logger.error('⚠️ Erro ao iniciar Backup Service:', err);
    }
  });

  /**
   * Evento: Interação criada (comandos, botões, modais)
   */
  client.on(Events.InteractionCreate, async (interaction) => {
    // Comandos de Slash
    if (interaction.isChatInputCommand()) {
      const command = commandCollection.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client, prisma);
      } catch (error) {
        logger.error(`❌ Erro no comando ${interaction.commandName}:`, error);
        const msg = '❌ Erro ao executar o comando.';

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: msg });
          } else {
            await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
          }
        } catch (replyErr) {
          logger.error('❌ Falha ao enviar mensagem de erro:', replyErr);
        }
      }
      return;
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
      const command = commandCollection.get(interaction.commandName);
      if (!command) return;

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction, client, prisma);
        }
      } catch (error) {
        logger.error(`❌ Erro no autocomplete do comando ${interaction.commandName}:`, error);
      }
      return;
    }

    // Tratadores de Interação Social (Sugestões, Feed e Parcerias e Configs)
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit() || interaction.isRoleSelectMenu?.() || interaction.isUserSelectMenu?.() || interaction.isChannelSelectMenu?.()) {
      try {
        const { ConfigInteractionHandler } = await import('../handlers/configHandler.js');
        if (await ConfigInteractionHandler.handle(interaction)) return;
      } catch (err) {
        logger.error('❌ Erro no ConfigInteractionHandler:', err);
      }

      try {
        if (interaction.isButton()) {
          if (interaction.customId.startsWith('suggest_')) {
            return await SuggestionService.handleVote(interaction);
          } else if (interaction.customId.startsWith('feed_')) {
            return await FeedService.handleInteraction(interaction);
          } else if (interaction.customId.startsWith('partner_')) {
            return await PartnershipService.handleAnalysis(interaction);
          }
        }
      } catch (err) {
        logger.error('❌ Erro ao processar interação de botão:', err);
      }
    }

    // Tratadores de Modais
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith('modal_feed_')) {
          return await FeedService.handleModal(interaction);
        } else if (interaction.customId === 'modal_partner_apply') {
          return await PartnershipService.handleModalSubmit(interaction);
        }
      } catch (err) {
        logger.error('❌ Erro ao processar submissão de modal:', err);
      }
    }

    // Tratadores de Tickets
    try {
      const handledByTicket = await TicketInteractionHandler.handle(interaction);
      if (handledByTicket) return;
    } catch (err) {
      logger.error('❌ Erro ao processar interação de ticket:', err);
    }

    // Fallback: Apenas logar interações não tratadas (evitar responder para não quebrar collectors locais)
    if (!(interaction as any).replied && !(interaction as any).deferred) {
      // Não responder nada aqui, pois pode haver um collector local aguardando
      // Apenas logar para debug se necessário
      // logger.debug(`Interação não tratada globalmente: ${interaction.id} (${interaction.type})`);
    }
  });

  // Tratamento de Erros Global
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Rejeição não tratada:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('❌ Exceção não capturada:', error);
  });

  /**
   * Evento: Mensagem criada
   */
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
      // --- Lógica de IA (Menções e Respostas) ---
      const handledByAI = await MentionHandler.handle(message);
      if (handledByAI) return;
    } catch (err) {
      logger.error('⚠️ Erro no MentionHandler:', err);
    }

    // --- Lógica de AFK ---
    try {
      const authorData = await prisma.user.findUnique({ where: { id: message.author.id } });

      if (authorData?.afkReason) {
        await prisma.user.update({
          where: { id: message.author.id },
          data: { afkReason: null, afkSince: null }
        });

        const welcomeBack = await message.reply(`👋 Bem-vindo de volta, **${message.author.username}**! Removi seu status de AFK.`);

        setTimeout(async () => {
          try {
            await welcomeBack.delete();
          } catch (err) {
            // Mensagem já deletada ou sem permissão
          }
        }, 5000);
      }

      // Verificar menções de usuários AFK
      if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
          if (id === message.author.id) continue;

          const targetData = await prisma.user.findUnique({ where: { id } });
          if (targetData?.afkReason) {
            const afkEmbed = new EmbedBuilder()
              .setColor(EMBED_COLORS.WARNING)
              .setAuthor({ name: `${user.username} está AFK`, iconURL: user.displayAvatarURL() })
              .setDescription(`**Motivo:** ${targetData.afkReason}\n**Desde:** <t:${Math.floor(targetData.afkSince!.getTime() / 1000)}:R>`)
              .setFooter({ text: EMBED_CREDIT });

            await message.reply({ embeds: [afkEmbed] });
          }
        }
      }
    } catch (err) {
      logger.error('⚠️ Erro na lógica de AFK:', err);
    }

    // --- Lógica de Dados (Dice Roller) ---
    try {
      if (DiceRoller.handleMessage(message)) return;
    } catch (err) {
      logger.error('⚠️ Erro no DiceRoller:', err);
    }

    // --- Lógica de Rolls Dinâmicos ---
    try {
      if (await RollService.handleMessage(message)) return;
    } catch (err) {
      logger.error('⚠️ Erro no RollService:', err);
    }

    // --- Lógica de Parcerias (Detecção de Convites) ---
    try {
      await PartnershipService.handleInviteDetection(message);
    } catch (err) {
      logger.error('⚠️ Erro na detecção de parcerias:', err);
    }

    // --- Lógica de Eventos Aleatórios ---
    try {
      if (EventService.isEventActive(EventType.MONEY_RAIN)) {
        const config = EventService.getConfig().random_events.money_rain;
        const amount = Math.floor(Math.random() * (config.max_amount - config.min_amount + 1)) + config.min_amount;

        await prisma.economy.upsert({
          where: { userId: message.author.id },
          update: { wallet: { increment: BigInt(amount) } },
          create: { userId: message.author.id, wallet: BigInt(amount) }
        });
      }
    } catch (err) {
      logger.error('⚠️ Erro nos eventos aleatórios:', err);
    }

    // --- Lógica de Daily Quests ---
    try {
      if (message.member && QuestService.isEligible(message.member)) {
        await QuestService.generateDailyQuests(message.author.id, message.guildId!);
        await QuestService.incrementProgress(message.author.id, message.guildId!, QuestType.MESSAGES);
      }
    } catch (err) {
      logger.error('⚠️ Erro no QuestService:', err);
    }

    // --- Lógica de Leveling (XP) ---
    try {
      // Verificar se member existe antes de processar XP
      if (!message.member) return;

      const xpResult = await LevelService.addExperience(message.member, message.channel.id, message.content);

      if (xpResult?.leveledUp && levelingConfig.level_up_message.enabled) {
        const config = levelingConfig.level_up_message;
        const targetChannel = config.channel_id
          ? (message.guild.channels.cache.get(config.channel_id) as TextChannel)
          : (message.channel as TextChannel);

        if (targetChannel) {
          const replacePlaceholders = (str: string) =>
            str.replace(/{user}/g, message.author.toString())
              .replace(/{username}/g, message.author.username)
              .replace(/{level}/g, (xpResult?.newLevel ?? 0).toString())
              .replace(/{rewards}/g, xpResult?.rewards?.length ? `Você ganhou os cargos: ${xpResult.rewards.map(r => `<@&${r}>`).join(', ')}` : '');

          if (config.use_embed) {
            const embed = new EmbedBuilder()
              .setTitle(replacePlaceholders(config.embed.title))
              .setDescription(replacePlaceholders(config.embed.description))
              .setColor(config.embed.color as any)
              .setFooter({ text: replacePlaceholders(config.embed.footer) })
              .setTimestamp();

            if (config.embed.thumbnail) {
              embed.setThumbnail(message.author.displayAvatarURL());
            }

            await targetChannel.send({
              content: replacePlaceholders(config.content),
              embeds: [embed]
            });
          } else {
            await targetChannel.send(replacePlaceholders(config.content));
          }
        }
      }
    } catch (err) {
      logger.error('⚠️ Erro no LevelService:', err);
    }

    // Incrementar contadores de atividade para eventos
    EventService.trackMessage();

    // Incrementar UserMessageStats para Daily
    try {
      await prisma.userMessageStats.upsert({
        where: { userId: message.author.id },
        update: {
          totalMessages: { increment: 1 },
          messagesSinceDaily: { increment: 1 }
        },
        create: {
          userId: message.author.id,
          totalMessages: 1,
          messagesSinceDaily: 1
        }
      });
    } catch (err) {
      logger.error('⚠️ Erro ao atualizar UserMessageStats:', err);
    }

    // --- Comandos com Prefixo ---
    const prefix = appConfig.commands.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = commands.find(cmd =>
      cmd.name === commandName || cmd.aliases?.includes(commandName)
    );

    if (command) {
      try {
        await command.execute(message, client, prisma, args);
      } catch (error) {
        logger.error(`❌ Erro no comando ${commandName}:`, error);
        await message.reply('❌ Erro ao executar o comando.').catch(() => { });
      }
    }
  });

  /**
   * Evento: Novo membro entra no servidor
   */
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const { welcomeConfig } = await import('@shared/config/yamlLoader.js');
      if (!welcomeConfig?.enabled) return;

      // Atribuir cargos iniciais
      if (welcomeConfig.initial_roles?.length > 0) {
        try {
          await member.roles.add(welcomeConfig.initial_roles);
          logger.info(`✅ Cargos iniciais atribuídos a ${member.id}`);
        } catch (e) {
          logger.error(`❌ Erro ao atribuir cargos iniciais para ${member.id}:`, e);
        }
      }

      // Enviar mensagem de boas-vindas na DM
      if (welcomeConfig.dm_message?.enabled) {
        try {
          const replacePlaceholders = (str: string) =>
            str.replace(/{user}/g, member.toString())
              .replace(/{username}/g, member.user.username)
              .replace(/{server}/g, member.guild.name);

          if (welcomeConfig.dm_message.use_embed) {
            const embed = new EmbedBuilder()
              .setTitle(replacePlaceholders(welcomeConfig.dm_message.embed.title))
              .setDescription(replacePlaceholders(welcomeConfig.dm_message.embed.description))
              .setColor(welcomeConfig.dm_message.embed.color as any)
              .setTimestamp();

            if (welcomeConfig.dm_message.embed.thumbnail) {
              embed.setThumbnail(member.user.displayAvatarURL());
            }

            if (welcomeConfig.dm_message.embed.image && typeof welcomeConfig.dm_message.embed.image === 'string' && welcomeConfig.dm_message.embed.image.startsWith('http')) {
              embed.setImage(welcomeConfig.dm_message.embed.image);
            }

            await member.send({
              content: replacePlaceholders(welcomeConfig.dm_message.content),
              embeds: [embed]
            });
          } else {
            await member.send(replacePlaceholders(welcomeConfig.dm_message.content));
          }

          logger.info(`✅ Mensagem de boas-vindas enviada para ${member.id}`);
        } catch (e) {
          logger.error(`❌ Erro ao enviar mensagem de boas-vindas na DM para ${member.id}:`, e);
        }
      }
    } catch (err) {
      logger.error('❌ Erro no evento GuildMemberAdd:', err);
    }
  });

  // Login no Discord
  try {
    await client.login(appConfig.discord.token);
  } catch (err) {
    logger.error('❌ Erro ao fazer login no Discord:', err);
    process.exit(1);
  }
}

// Iniciar bot
bootstrap().catch(err => {
  logger.error('💥 Falha crítica na inicialização:', err);
  process.exit(1);
});
