import { REQUIRED_PERMISSIONS_METADATA, type CanActivate } from '@discord.ts/common';
import { replyEphemeral } from '@discord.ts/ux';
import { PermissionsBitField, type PermissionResolvable } from 'discord.js';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

export class PermissionsGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const fn = context.getHandler() as object;
    const cls = context.getClass() as object;
    const required =
      (Reflect.getMetadata(REQUIRED_PERMISSIONS_METADATA, fn) as
        | PermissionResolvable[]
        | undefined) ??
      (Reflect.getMetadata(REQUIRED_PERMISSIONS_METADATA, cls) as
        | PermissionResolvable[]
        | undefined) ??
      [];
    if (!required.length) return true;
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const perms =
      (ix['memberPermissions'] as { has(p: unknown): boolean } | null | undefined) ??
      (ix['member'] as { permissions?: { has(p: unknown): boolean } } | null | undefined)
        ?.permissions;
    const missing = required.filter((p) => !perms || !perms.has(p));
    if (!missing.length) return true;
    const names = new PermissionsBitField(missing).toArray().join(', ');
    await replyEphemeral(ix, `Missing permissions: ${names || 'unknown'}.`);
    return false;
  }
}
