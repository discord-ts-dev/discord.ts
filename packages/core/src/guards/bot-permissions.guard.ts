import { REQUIRED_BOT_PERMISSIONS_METADATA, type CanActivate } from '@discord.ts/common';
import { replyEphemeral, type EphemeralTarget } from '@discord.ts/ux';
import { PermissionsBitField, type PermissionResolvable } from 'discord.js';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: mirrors PermissionsGuard but checks the bot member, not the caller.
export class BotPermissionsGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const fn = context.getHandler() as object;
    const cls = context.getClass() as object;
    const required =
      (Reflect.getMetadata(REQUIRED_BOT_PERMISSIONS_METADATA, fn) as
        | PermissionResolvable[]
        | undefined) ??
      (Reflect.getMetadata(REQUIRED_BOT_PERMISSIONS_METADATA, cls) as
        | PermissionResolvable[]
        | undefined) ??
      [];
    if (!required.length) return true;
    const ix = context.getArgByIndex<Record<string, unknown> & EphemeralTarget>(0);
    const guild = ix['guild'] as
      | { members?: { me?: { permissions?: { has(p: unknown): boolean } } | null } | null }
      | null
      | undefined;
    const perms = guild?.members?.me?.permissions;
    const missing = required.filter((p) => !perms || !perms.has(p));
    if (!missing.length) return true;
    const names = new PermissionsBitField(missing).toArray().join(', ');
    await replyEphemeral(ix, `Bot is missing permissions: ${names || 'unknown'}.`);
    return false;
  }
}
