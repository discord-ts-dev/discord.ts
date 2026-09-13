import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COOLDOWN_METADATA } from '@discord.ts/common';

// ponytail: bounded in-memory map, FIFO evict on overflow, per-key expiry
const MAX_ENTRIES = 5000;

@Injectable()
export class CooldownGuard implements CanActivate {
  private readonly hits = new Map<string, number>();

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const seconds =
      this.reflector.getAllAndOverride<number>(COOLDOWN_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 0;
    if (!seconds) return true;
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId =
      (ix['user'] as { id?: string } | undefined)?.id ??
      (ix['author'] as { id?: string } | undefined)?.id;
    if (!userId) return true;
    const handler = context.getHandler() as { name?: string };
    const key = `${userId}:${context.getClass().name}.${handler.name}`;
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
    try {
      const reply = ix['reply'] as ((msg: unknown) => Promise<unknown>) | undefined;
      if (typeof reply === 'function' && !ix['replied'] && !ix['deferred'])
        await (reply as (m: unknown) => Promise<unknown>).call(ix, {
          content: text,
          ephemeral: true,
        });
    } catch {
      // ignore, handler already blocked
    }
  }
}
