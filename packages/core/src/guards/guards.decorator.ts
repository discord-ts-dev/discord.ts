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
import { PermissionsGuard } from './permissions.guard.js';

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
