import type { CanActivate } from '@discord.ts/common';
import { replyEphemeral, type EphemeralTarget } from '@discord.ts/ux';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: fail-closed allowlist. Empty owners denies everyone, so the
// `new Ctor()` fallback in routing stays safe. Owners come from config.
export class OwnerGuard implements CanActivate {
  constructor(private readonly owners: string[] = []) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown> & EphemeralTarget>(0);
    const author = ix['author'] ?? ix['user'];
    const id = (author as { id?: unknown } | null | undefined)?.id;
    if (typeof id === 'string' && this.owners.includes(id)) return true;
    await replyEphemeral(ix, 'Owner only.');
    return false;
  }
}
