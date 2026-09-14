import {
  COOLDOWN_METADATA,
  REQUIRED_PERMISSIONS_METADATA,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@discord.ts/common';
import type { PermissionResolvable } from 'discord.js';
import { CooldownGuard } from './cooldown.guard.js';
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
