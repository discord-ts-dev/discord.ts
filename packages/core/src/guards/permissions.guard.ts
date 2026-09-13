import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionResolvable } from 'discord.js';
import { PermissionsBitField } from 'discord.js';
import { REQUIRED_PERMISSIONS_METADATA } from '../constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<PermissionResolvable[]>(REQUIRED_PERMISSIONS_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (!required.length) return true;
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const perms =
      (ix['memberPermissions'] as { has(p: unknown): boolean } | null | undefined) ??
      (ix['member'] as { permissions?: { has(p: unknown): boolean } } | null | undefined)
        ?.permissions;
    const missing = required.filter((p) => !perms || !perms.has(p));
    if (!missing.length) return true;
    const names = new PermissionsBitField(missing).toArray().join(', ');
    try {
      const reply = ix['reply'] as ((msg: unknown) => Promise<unknown>) | undefined;
      if (typeof reply === 'function' && !ix['replied'] && !ix['deferred'])
        await (reply as (m: unknown) => Promise<unknown>).call(ix, {
          content: `Missing permissions: ${names || 'unknown'}.`,
          ephemeral: true,
        });
    } catch {
      // ignore, handler already blocked
    }
    return false;
  }
}
