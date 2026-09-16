import type { CanActivate } from '@discord.ts/common';
import { replyEphemeral, type EphemeralTarget } from '@discord.ts/ux';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: mirrors the permission guards but only checks presence of a
// guild. Interactions carry .guild (null in DMs).
export class GuildGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown> & EphemeralTarget>(0);
    if (ix['guild'] !== null && ix['guild'] !== undefined) return true;
    await replyEphemeral(ix, 'Use this command in a server.');
    return false;
  }
}
