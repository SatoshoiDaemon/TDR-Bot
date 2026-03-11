import {
  Client,
  Guild,
  GuildChannel,
  Role,
  ChannelType,
  PermissionOverwrites
} from 'discord.js';
import {
  SnapshotData,
  ChannelSnapshot,
  RoleSnapshot,
  GuildConfigSnapshot,
  PermissionSnapshot
} from '../types/types.js';
import { SnapshotDatabase } from '../database/database.js';

export class SnapshotService {
  constructor(
    private client: Client,
    private database: SnapshotDatabase
  ) {}

  async createGuildSnapshot(guildId: string): Promise<SnapshotData> {
    const guild = await this.client.guilds.fetch(guildId);

    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }

    console.log(`Criando snapshot da guild: ${guild.name}`);

    const channels = await this.snapshotChannels(guild);
    const roles = await this.snapshotRoles(guild);
    const guildConfig = this.snapshotGuildConfig(guild);

    const snapshot: SnapshotData = {
      timestamp: Date.now(),
      guildId: guild.id,
      guildName: guild.name,
      channels,
      roles,
      guildConfig
    };

    await this.database.saveGuildSnapshot(snapshot, 'full');
    console.log(`Snapshot da guild salvo: ${channels.length} canais, ${roles.length} cargos`);

    return snapshot;
  }

  async createCategorySnapshot(guildId: string, categoryId: string): Promise<any> {
    const guild = await this.client.guilds.fetch(guildId);

    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }

    const category = guild.channels.cache.get(categoryId);

    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error(`Category ${categoryId} not found or is not a category`);
    }

    console.log(`Criando snapshot da categoria: ${category.name}`);

    const categoryChannels = guild.channels.cache.filter(
      ch => ch.parentId === categoryId
    );

    const channels: ChannelSnapshot[] = [];

    for (const [_, channel] of categoryChannels) {
      if (channel instanceof GuildChannel) {
        channels.push(await this.snapshotChannel(channel));
      }
    }

    const categorySnapshot = {
      id: category.id,
      name: category.name,
      position: category.position,
      permissions: this.snapshotPermissions(category.permissionOverwrites),
      channels
    };

    await this.database.saveCategorySnapshot(
      Date.now(),
      guildId,
      categoryId,
      category.name,
      categorySnapshot
    );

    console.log(`Snapshot da categoria salvo: ${channels.length} canais`);

    return categorySnapshot;
  }

  private async snapshotChannels(guild: Guild): Promise<ChannelSnapshot[]> {
    const channels: ChannelSnapshot[] = [];

    for (const [_, channel] of guild.channels.cache) {
      if (channel instanceof GuildChannel) {
        channels.push(await this.snapshotChannel(channel));
      }
    }

    return channels;
  }

  private async snapshotChannel(channel: GuildChannel): Promise<ChannelSnapshot> {
    const baseSnapshot: ChannelSnapshot = {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      position: channel.position,
      parentId: channel.parentId,
      nsfw: 'nsfw' in channel ? Boolean(channel.nsfw) : false,
      permissions: this.snapshotPermissions(channel.permissionOverwrites)
    };

    if (channel.isTextBased() && 'topic' in channel) {
      baseSnapshot.topic = channel.topic;
      baseSnapshot.rateLimitPerUser = 'rateLimitPerUser' in channel ? (channel.rateLimitPerUser ?? undefined) : undefined;
    }

    if (channel.isVoiceBased()) {
      baseSnapshot.bitrate = 'bitrate' in channel ? channel.bitrate : undefined;
      baseSnapshot.userLimit = 'userLimit' in channel ? channel.userLimit : undefined;
    }

    return baseSnapshot;
  }

  private snapshotPermissions(
    permissionOverwrites: PermissionOverwrites | any
  ): PermissionSnapshot[] {
    if (!permissionOverwrites || !permissionOverwrites.cache) {
      return [];
    }

    return Array.from(permissionOverwrites.cache.values()).map((overwrite: any) => ({
      id: overwrite.id,
      type: overwrite.type === 0 ? 'role' as const : 'member' as const,
      allow: overwrite.allow.bitfield.toString(),
      deny: overwrite.deny.bitfield.toString()
    }));
  }

  private async snapshotRoles(guild: Guild): Promise<RoleSnapshot[]> {
    const roles: RoleSnapshot[] = [];

    for (const [_, role] of guild.roles.cache) {
      roles.push(this.snapshotRole(role));
    }

    return roles.sort((a, b) => b.position - a.position);
  }

  private snapshotRole(role: Role): RoleSnapshot {
    return {
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
      icon: role.icon,
      unicodeEmoji: role.unicodeEmoji
    };
  }

  private snapshotGuildConfig(guild: Guild): GuildConfigSnapshot {
    return {
      afkChannelId: guild.afkChannelId,
      afkTimeout: guild.afkTimeout,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      explicitContentFilter: guild.explicitContentFilter,
      mfaLevel: guild.mfaLevel,
      systemChannelId: guild.systemChannelId,
      verificationLevel: guild.verificationLevel,
      description: guild.description,
      iconURL: guild.iconURL(),
      bannerURL: guild.bannerURL()
    };
  }
}
