import type { CanActivate } from '@discord.ts/common';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: mirrors the permission guards but only checks presence of a
// guild. Interactions and prefix messages both carry .guild (null in DMs).
export class GuildGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    if (ix['guild'] !== null && ix['guild'] !== undefined) return true;
    try {
      const reply = ix['reply'] as ((msg: unknown) => Promise<unknown>) | undefined;
      if (typeof reply === 'function' && !ix['replied'] && !ix['deferred'])
        await (reply as (m: unknown) => Promise<unknown>).call(ix, {
          content: 'Use this command in a server.',
          ephemeral: true,
        });
    } catch {
      // ignore, handler already blocked
    }
    return false;
  }
}
