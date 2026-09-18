import { COOLDOWN_METADATA, type CanActivate } from '@discord.ts/common';
import { replyEphemeral } from '@discord.ts/ux';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

// ponytail: bounded in-memory map, FIFO evict on overflow, per-key expiry
const MAX_ENTRIES = 5000;

export class CooldownGuard implements CanActivate {
  constructor() {}
  private readonly hits = new Map<string, number>();

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const fn = context.getHandler() as object;
    const cls = context.getClass() as object;
    const seconds =
      (Reflect.getMetadata(COOLDOWN_METADATA, fn) as number | undefined) ??
      (Reflect.getMetadata(COOLDOWN_METADATA, cls) as number | undefined) ??
      0;
    if (!seconds) return true;
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId =
      (ix['user'] as { id?: string } | undefined)?.id ??
      (ix['author'] as { id?: string } | undefined)?.id;
    if (!userId) return true;
    const handler = context.getHandler() as { name?: string };
    const key = `${userId}:${(context.getClass() as { name?: string }).name}.${handler.name}`;
    const now = Date.now();
    const until = this.hits.get(key) ?? 0;
    if (now < until) {
      const left = Math.ceil((until - now) / 1000);
      await this.deny(ix, `Slow down. Try again in ${left}s.`);
      return false;
    }
    this.hits.set(key, now + seconds * 1000);
    if (this.hits.size > MAX_ENTRIES) {
      const oldest = this.hits.keys().next().value as string;
      this.hits.delete(oldest);
    }
    return true;
  }

  private async deny(ix: Record<string, unknown>, text: string): Promise<void> {
    await replyEphemeral(ix, text);
  }
}
