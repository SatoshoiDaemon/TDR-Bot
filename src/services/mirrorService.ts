import {
  Client,
  Guild,
  GuildChannel,
  ChannelType,
  TextChannel,
  ForumChannel,
  PermissionsBitField,
  Collection,
  Message,
  CategoryChannel,
  ThreadChannel
} from 'discord.js';
import { prisma } from '@database/client.js';
import { SnapshotDatabase } from '../database/database.js';
import { MessageSnapshot, ForumThreadSnapshot, TextChannelThreadSnapshot } from '../types/types.js';
import { MediaService } from './mediaService.js';
import { logger } from '@shared/logger.js';

export class MirrorService {
  private syncStats = { channels: 0, messages: 0, threads: 0, skipped: 0 };

  constructor(
    private client: Client,
    private database: SnapshotDatabase
  ) { }

  async analyzeCategory(
    sourceGuildId: string,
    targetGuildId: string,
    categoryId: string
  ): Promise<{ channels: number; messages: number; threads: number }> {
    const sourceGuild = await this.client.guilds.fetch(sourceGuildId);
    const targetGuild = await this.client.guilds.fetch(targetGuildId);

    if (!sourceGuild || !targetGuild) {
      throw new Error('Source or target guild not found');
    }

    const sourceCategory = sourceGuild.channels.cache.get(categoryId);
    if (!sourceCategory || sourceCategory.type !== ChannelType.GuildCategory) {
      throw new Error('Source category not found');
    }

    const sourceChannels = sourceGuild.channels.cache.filter(ch => ch.parentId === categoryId);
    let totalMessages = 0;
    let totalThreads = 0;

    for (const [_, channel] of sourceChannels) {
      if (channel.type === ChannelType.GuildText) {
        const messages = await (channel as TextChannel).messages.fetch({ limit: 1 });
        totalMessages += messages.size;
      } else if (channel.type === ChannelType.GuildForum) {
        const threads = await (channel as ForumChannel).threads.fetchActive();
        totalThreads += threads.threads.size;
      }
    }

    return {
      channels: sourceChannels.size,
      messages: totalMessages,
      threads: totalThreads
    };
  }

  async mirrorCategory(
    sourceGuildId: string,
    targetGuildId: string,
    categoryId: string
  ): Promise<void> {
    this.syncStats = { channels: 0, messages: 0, threads: 0, skipped: 0 };

    console.log('Iniciando espelhamento de categoria...');

    const sourceGuild = await this.client.guilds.fetch(sourceGuildId);
    const targetGuild = await this.client.guilds.fetch(targetGuildId);

    if (!sourceGuild || !targetGuild) {
      throw new Error('Source or target guild not found');
    }

    const sourceCategory = sourceGuild.channels.cache.get(categoryId);

    if (!sourceCategory || sourceCategory.type !== ChannelType.GuildCategory) {
      throw new Error('Source category not found');
    }

    console.log(`Espelhando categoria: ${sourceCategory.name}`);

    let targetCategory = targetGuild.channels.cache.find(
      ch => ch.name === sourceCategory.name && ch.type === ChannelType.GuildCategory
    ) as CategoryChannel | undefined;

    if (!targetCategory) {
      targetCategory = await targetGuild.channels.create({
        name: sourceCategory.name,
        type: ChannelType.GuildCategory,
        position: sourceCategory.position
      });

      await this.syncPermissions(sourceCategory, targetCategory);
      console.log('Categoria criada no servidor de destino');
    }

    const sourceChannels = sourceGuild.channels.cache.filter(
      ch => ch.parentId === categoryId
    );

    for (const [_, sourceChannel] of sourceChannels) {
      if (sourceChannel instanceof GuildChannel) {
        await this.mirrorChannel(sourceChannel, targetGuild, targetCategory);
      }
    }

    await this.database.updateMirrorSyncState(sourceGuildId, targetGuildId, categoryId, this.syncStats.messages, this.syncStats.threads);

    console.log('Espelhamento de categoria concluído.');
    console.log(`Stats: ${this.syncStats.channels} canais, ${this.syncStats.messages} mensagens, ${this.syncStats.threads} threads (${this.syncStats.skipped} ignorados)`);
  }

  private async mirrorChannel(
    sourceChannel: GuildChannel,
    targetGuild: Guild,
    targetCategory: CategoryChannel
  ): Promise<void> {
    let targetChannel = targetGuild.channels.cache.find(
      ch => ch.name === sourceChannel.name && ch.parentId === targetCategory.id
    );

    if (!targetChannel) {
      targetChannel = await this.createChannelCopy(sourceChannel, targetGuild, targetCategory) as any;
      console.log(`Canal criado: ${sourceChannel.name}`);
    }

    if (targetChannel) {
      await this.syncPermissions(sourceChannel, targetChannel as GuildChannel);

      if (sourceChannel.type === ChannelType.GuildText && targetChannel.type === ChannelType.GuildText) {
        await this.copyMessages(
          sourceChannel as TextChannel,
          targetChannel as TextChannel
        );
        // Copy text channel threads
        await this.copyTextChannelThreads(
          sourceChannel as TextChannel,
          targetChannel as TextChannel
        );
      } else if (sourceChannel.type === ChannelType.GuildForum && 'threads' in targetChannel) {
        await this.copyForumThreads(
          sourceChannel as ForumChannel,
          targetChannel as ForumChannel
        );
      }
    }
  }

  private async createChannelCopy(
    sourceChannel: GuildChannel,
    targetGuild: Guild,
    targetCategory: CategoryChannel
  ): Promise<GuildChannel> {
    const baseOptions: any = {
      name: sourceChannel.name,
      type: sourceChannel.type,
      parent: targetCategory.id,
      position: sourceChannel.position
    };

    if (sourceChannel.isTextBased() && 'topic' in sourceChannel) {
      baseOptions.topic = sourceChannel.topic || undefined;
      if ('nsfw' in sourceChannel) {
        baseOptions.nsfw = sourceChannel.nsfw;
      }
      if ('rateLimitPerUser' in sourceChannel) {
        baseOptions.rateLimitPerUser = sourceChannel.rateLimitPerUser;
      }
    }

    if (sourceChannel.isVoiceBased()) {
      if ('bitrate' in sourceChannel) {
        baseOptions.bitrate = sourceChannel.bitrate;
      }
      if ('userLimit' in sourceChannel) {
        baseOptions.userLimit = sourceChannel.userLimit;
      }
    }

    return await targetGuild.channels.create(baseOptions);
  }

  private async syncPermissions(
    sourceChannel: GuildChannel,
    targetChannel: GuildChannel
  ): Promise<void> {
    const sourcePerms = sourceChannel.permissionOverwrites.cache;

    for (const [id, overwrite] of sourcePerms) {
      const targetRole = targetChannel.guild.roles.cache.find(
        r => r.name === sourceChannel.guild.roles.cache.get(id)?.name
      );

      if (targetRole) {
        const allowPerms = overwrite.allow.toArray();
        const denyPerms = overwrite.deny.toArray();

        const permissions: any = {};
        allowPerms.forEach(perm => permissions[perm] = true);
        denyPerms.forEach(perm => permissions[perm] = false);

        await targetChannel.permissionOverwrites.edit(targetRole.id, permissions);
      }
    }
  }

  private async copyMessages(
    sourceChannel: TextChannel,
    targetChannel: TextChannel,
    limit: number = 100
  ): Promise<void> {
    try {
      console.log(`Copiando mensagens de #${sourceChannel.name}...`);

      let lastId: string | undefined;
      let totalCopied = 0;
      let totalSkipped = 0;
      const maxMessages = 1000;

      while (totalCopied < maxMessages) {
        const options: any = { limit: Math.min(100, maxMessages - totalCopied) };
        if (lastId) options.before = lastId;

        const messagesCollection: Collection<string, Message> = await sourceChannel.messages.fetch(options) as any;

        if (messagesCollection.size === 0) break;

        const messagesArray = Array.from(messagesCollection.values());
        const sortedMessages = messagesArray.reverse();

        for (const message of sortedMessages) {
          // Check if message already mirrored (anti-duplicação via SnapshotDB)
          const isMirrored = await this.database.isMessageMirrored(message.id);
          if (isMirrored) {
            totalSkipped++;
            continue;
          }

          await this.copyMessage(message, targetChannel);
          totalCopied++;
        }

        const messagesFromCollection = Array.from(messagesCollection.values());
        const lastMessage = messagesFromCollection.length > 0 ? messagesFromCollection[messagesFromCollection.length - 1] : undefined;
        lastId = lastMessage?.id;

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.syncStats.messages += totalCopied;
      this.syncStats.skipped += totalSkipped;

      console.log(`${totalCopied} mensagens copiadas de #${sourceChannel.name} (${totalSkipped} ignoradas)`);
    } catch (error) {
      console.error(`Erro ao copiar mensagens: ${error}`);
    }
  }

  private async copyMessage(
    sourceMessage: Message,
    targetChannel: TextChannel
  ): Promise<void> {
    try {
      const content = sourceMessage.content || '';
      const embeds = sourceMessage.embeds.length > 0 ? sourceMessage.embeds : [];

      const messageOptions: any = {};

      if (content) {
        messageOptions.content = `**${sourceMessage.author.tag}** (${new Date(sourceMessage.createdTimestamp).toLocaleString()}):\n${content}`;
      }

      if (embeds.length > 0) {
        messageOptions.embeds = embeds;
      }

      if (sourceMessage.attachments.size > 0) {
        const persistedUrls = await Promise.all(
          sourceMessage.attachments.map(async (a) => await MediaService.persistMedia(a.url))
        );
        messageOptions.content = (messageOptions.content || '') + `\n\n**Attachments (Persisted):**\n${persistedUrls.join('\n')}`;
      }

      let sentMessage = null;
      if (messageOptions.content || messageOptions.embeds) {
        try {
          // Try to send with original embeds (may have broken image links)
          sentMessage = await targetChannel.send(messageOptions);
        } catch (embedError: any) {
          // Fallback: Send without embeds if it fails (e.g., 404 on images)
          if (embedError.code === 50006 || embedError.message?.includes('404')) {
            console.warn(`Embed falhou para mensagem ${sourceMessage.id}, enviando sem imagens`);

            // Remove embeds and resend
            delete messageOptions.embeds;
            if (messageOptions.content) {
              sentMessage = await targetChannel.send(messageOptions);
            }
          } else {
            throw embedError;
          }
        }
      }

      // Archive embed data (JSON) regardless of success
      if (embeds.length > 0) {
        await this.database.saveEmbedArchive({
          messageId: sourceMessage.id,
          channelId: targetChannel.id,
          authorTag: sourceMessage.author.tag,
          timestamp: sourceMessage.createdTimestamp,
          embeds: sourceMessage.embeds.map(e => ({
            title: e.title,
            description: e.description,
            color: e.color,
            url: e.url,
            fields: e.fields,
            thumbnail: e.thumbnail,
            image: e.image,
            footer: e.footer,
            author: e.author,
            timestamp: e.timestamp
          })),
          archivedAt: Date.now()
        });
      }

      const messageSnapshot: MessageSnapshot = {
        id: sourceMessage.id,
        channelId: targetChannel.id,
        authorId: sourceMessage.author.id,
        authorTag: sourceMessage.author.tag,
        content: sourceMessage.content,
        timestamp: sourceMessage.createdTimestamp,
        embeds: JSON.stringify(sourceMessage.embeds),
        attachments: JSON.stringify(Array.from(sourceMessage.attachments.values())),
        reactions: JSON.stringify(Array.from(sourceMessage.reactions.cache.values()))
      };

      await this.database.saveMessage(messageSnapshot);
    } catch (error) {
      console.error(`Erro ao copiar mensagem ${sourceMessage.id}: ${error}`);
    }
  }

  private async copyForumThreads(
    sourceChannel: ForumChannel,
    targetChannel: ForumChannel
  ): Promise<void> {
    try {
      console.log(`Copiando threads do fórum #${sourceChannel.name}...`);

      const threads = await sourceChannel.threads.fetchActive();
      const archivedThreads = await sourceChannel.threads.fetchArchived();

      const allThreads = new Collection([...threads.threads, ...archivedThreads.threads]);
      let totalThreads = 0;
      let skippedThreads = 0;

      for (const [_, thread] of allThreads) {
        try {
          // Check if thread already mirrored
          if (await this.database.isThreadMirrored(thread.id)) {
            skippedThreads++;
            continue;
          }

          const newThread = await targetChannel.threads.create({
            name: thread.name,
            message: {
              content: `Thread mirrored from original server`
            }
          });

          const messages = await thread.messages.fetch({ limit: 100 });
          const sortedMessages = Array.from(messages.values()).reverse();

          for (const message of sortedMessages) {
            await this.copyMessage(message, newThread as any);
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          const threadSnapshot: ForumThreadSnapshot = {
            id: thread.id,
            channelId: targetChannel.id,
            name: thread.name,
            archived: thread.archived || false,
            locked: thread.locked || false,
            createdTimestamp: thread.createdTimestamp || Date.now(),
            messages: []
          };

          await this.database.saveForumThread(threadSnapshot);

          totalThreads++;
          console.log(`Thread copiada: ${thread.name}`);
        } catch (error) {
          console.error(`Erro ao copiar thread ${thread.name}: ${error}`);
        }
      }

      this.syncStats.threads += totalThreads;
      this.syncStats.skipped += skippedThreads;

      console.log(`${totalThreads} threads copiadas de #${sourceChannel.name} (${skippedThreads} ignoradas)`);
    } catch (error) {
      console.error(`Erro ao copiar threads do fórum: ${error}`);
    }
  }

  private async copyTextChannelThreads(
    sourceChannel: TextChannel,
    targetChannel: TextChannel
  ): Promise<void> {
    try {
      console.log(`Copiando threads de canal de texto #${sourceChannel.name}...`);

      // Fetch active threads
      const activeThreads = await sourceChannel.threads.fetchActive();

      // Fetch archived threads
      const archivedThreads = await sourceChannel.threads.fetchArchived();

      const allThreads = new Collection([...activeThreads.threads, ...archivedThreads.threads]);
      let totalThreads = 0;
      let skippedThreads = 0;

      for (const [_, thread] of allThreads) {
        try {
          // Check if thread already mirrored
          if (await this.database.isTextChannelThreadMirrored(thread.id)) {
            skippedThreads++;
            continue;
          }

          // Create the thread in the target channel
          const newThread = await targetChannel.threads.create({
            name: thread.name,
            autoArchiveDuration: thread.autoArchiveDuration || undefined
          });

          // Copy all messages from the thread
          let lastId: string | undefined;
          let messagesCopied = 0;

          while (true) {
            const options: any = { limit: 100 };
            if (lastId) options.before = lastId;

            const messagesCollection = await thread.messages.fetch(options) as any as Collection<string, Message>;

            if (messagesCollection.size === 0) break;

            const messagesArray = Array.from(messagesCollection.values());
            const sortedMessages = messagesArray.reverse();

            for (const message of sortedMessages) {
              await this.copyMessage(message, newThread as any);
              messagesCopied++;
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            const messagesFromCollection = Array.from(messagesCollection.values());
            const lastMessage = messagesFromCollection.length > 0 ? messagesFromCollection[messagesFromCollection.length - 1] : undefined;
            lastId = lastMessage?.id;
          }

          // Lock/archive the thread if needed
          if (thread.locked) {
            await newThread.setLocked(true);
          }
          if (thread.archived) {
            await newThread.setArchived(true);
          }

          // Save thread info to database
          const threadSnapshot: TextChannelThreadSnapshot = {
            id: thread.id,
            channelId: targetChannel.id,
            originalChannelId: sourceChannel.id,
            name: thread.name,
            archived: thread.archived || false,
            locked: thread.locked || false,
            createdTimestamp: thread.createdTimestamp || Date.now()
          };

          await this.database.saveTextChannelThread(threadSnapshot);

          totalThreads++;
          console.log(`Thread copiada: ${thread.name} (${messagesCopied} mensagens)`);
        } catch (error) {
          console.error(`Erro ao copiar thread ${thread.name}: ${error}`);
        }
      }

      this.syncStats.threads += totalThreads;
      this.syncStats.skipped += skippedThreads;

      console.log(`${totalThreads} threads copiadas de #${sourceChannel.name} (${skippedThreads} ignoradas)`);
    } catch (error) {
      console.error(`Erro ao copiar threads: ${error}`);
    }
  }
}
