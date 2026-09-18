import { DISCORD_OWNERS, Inject, type CanActivate } from '@discord.ts/common';
import { replyEphemeral } from '@discord.ts/ux';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: fail-closed allowlist. Empty owners denies everyone, so the
// registry-created guard stays safe. Owners come from config via @Inject.
export class OwnerGuard implements CanActivate {
  constructor(@Inject(DISCORD_OWNERS) private readonly owners: string[] = []) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const author = ix['author'] ?? ix['user'];
    const id = (author as { id?: unknown } | null | undefined)?.id;
    if (typeof id === 'string' && this.owners.includes(id)) return true;
    await replyEphemeral(ix, 'Owner only.');
    return false;
  }
}
