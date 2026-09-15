import {
  COOLDOWN_METADATA,
  REQUIRED_BOT_PERMISSIONS_METADATA,
  REQUIRED_PERMISSIONS_METADATA,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@discord.ts/common';
import type { PermissionResolvable } from 'discord.js';
import { BotPermissionsGuard } from './bot-permissions.guard.js';
import { CooldownGuard } from './cooldown.guard.js';
import { GuildGuard } from './guild.guard.js';
import { OwnerGuard } from './owner.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { SameVoiceGuard, VoiceGuard } from './voice.guard.js';

/** Block repeat calls per user for N seconds. Replies ephemeral on hit. */
export const Cooldown = (seconds: number): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(COOLDOWN_METADATA, seconds),
    UseGuards(CooldownGuard),
  ) as unknown as MethodDecorator & ClassDecorator;

/** Require Discord permissions. Replies ephemeral listing missing ones. */
export const RequirePermissions = (
  ...perms: PermissionResolvable[]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS_METADATA, perms),
    UseGuards(PermissionsGuard),
  ) as unknown as MethodDecorator & ClassDecorator;

/** Require the bot member to hold Discord permissions. Replies ephemeral listing missing ones. */
export const RequireBotPermissions = (
  ...perms: PermissionResolvable[]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(REQUIRED_BOT_PERMISSIONS_METADATA, perms),
    UseGuards(BotPermissionsGuard),
  ) as unknown as MethodDecorator & ClassDecorator;

/** Require the command to run in a guild. Replies ephemeral in DMs. */
export const RequireGuild = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(GuildGuard)) as unknown as MethodDecorator & ClassDecorator;

/** Require a configured owner (`owners` or `DISCORD_OWNER_IDS`). Denies everyone when unset. */
export const RequireOwner = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(OwnerGuard)) as unknown as MethodDecorator & ClassDecorator;

/** Require the caller to be in a voice channel. Replies ephemeral otherwise. */
export const RequireVoice = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(VoiceGuard)) as unknown as MethodDecorator & ClassDecorator;

/** Require the caller to share the bot's voice channel (bot idle counts as shared). */
export const SameVoice = (): MethodDecorator & ClassDecorator =>
  applyDecorators(UseGuards(SameVoiceGuard)) as unknown as MethodDecorator & ClassDecorator;
