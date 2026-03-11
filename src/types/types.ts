import { PermissionOverwrites, ChannelType } from 'discord.js';

export interface SnapshotData {
  timestamp: number;
  guildId: string;
  guildName: string;
  channels: ChannelSnapshot[];
  roles: RoleSnapshot[];
  guildConfig: GuildConfigSnapshot;
}

export interface ChannelSnapshot {
  id: string;
  name: string;
  type: ChannelType;
  position: number;
  parentId: string | null;
  topic?: string | null;
  nsfw: boolean;
  rateLimitPerUser?: number;
  bitrate?: number;
  userLimit?: number;
  permissions: PermissionSnapshot[];
}

export interface PermissionSnapshot {
  id: string;
  type: 'role' | 'member';
  allow: string;
  deny: string;
}

export interface RoleSnapshot {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  icon?: string | null;
  unicodeEmoji?: string | null;
}

export interface GuildConfigSnapshot {
  afkChannelId: string | null;
  afkTimeout: number;
  defaultMessageNotifications: number;
  explicitContentFilter: number;
  mfaLevel: number;
  systemChannelId: string | null;
  verificationLevel: number;
  description: string | null;
  iconURL: string | null;
  bannerURL: string | null;
}

export interface MessageSnapshot {
  id: string;
  channelId: string;
  authorId: string;
  authorTag: string;
  content: string;
  timestamp: number;
  embeds: string;
  attachments: string;
  reactions: string;
}

export interface ForumThreadSnapshot {
  id: string;
  channelId: string;
  name: string;
  archived: boolean;
  locked: boolean;
  createdTimestamp: number;
  messages: MessageSnapshot[];
}

export interface TextChannelThreadSnapshot {
  id: string;
  channelId: string;
  originalChannelId: string;
  name: string;
  archived: boolean;
  locked: boolean;
  createdTimestamp: number;
}
export interface EmbedArchive {
  messageId: string;
  channelId: string;
  authorTag: string;
  timestamp: number;
  embeds: Array<{
    title?: string | null;
    description?: string | null;
    color?: number | null;
    url?: string | null;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    thumbnail?: {
      url?: string | null;
      height?: number;
      width?: number;
    } | null;
    image?: {
      url?: string | null;
      height?: number;
      width?: number;
    } | null;
    footer?: {
      text?: string;
      icon_url?: string | null;
    } | null;
    author?: {
      name?: string | null;
      url?: string | null;
      icon_url?: string | null;
    } | null;
    timestamp?: string | null;
  }>;
  archivedAt: number;
}