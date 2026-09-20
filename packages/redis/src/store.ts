import type { SortedEntry, Store, StoreUpdate } from '@discord.ts/systems';
import type { RedisClientLike, RedisClientOptions } from './client.js';

export interface RedisStoreOptions {
  /** Connection URL. Defaults to Bun's resolution: REDIS_URL, then localhost. */
  url?: string;
  /** Options forwarded to Bun's RedisClient. */
  options?: RedisClientOptions;
  /** Bring your own client; a store never closes a client it did not build. */
  client?: RedisClientLike;
}

const UPDATE_ATTEMPTS = 50;

/**
 * The Store port over Redis (ADR 0011). Values are strings, sorted sets are
 * scores, and `update()` runs through WATCH/MULTI/EXEC with retries so
 * compound systems stay atomic across processes. Store operations serialize
 * on one queue, so a transaction never interleaves with another store call;
 * using the raw client concurrently is safe only as far as Redis itself is.
 */
export class RedisStore implements Store {
  readonly client: RedisClientLike;
  private readonly ownsClient: boolean;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(input?: string | RedisStoreOptions) {
    const options = typeof input === 'string' ? { url: input } : (input ?? {});
    this.ownsClient = options.client === undefined;
    this.client =
      options.client ??
      (new Bun.RedisClient(options.url, options.options) as unknown as RedisClientLike);
  }

  /** Close the client when this store built it. Caller-owned clients stay open. */
  close(): void {
    if (this.ownsClient) void this.client.close();
  }

  get(key: string): Promise<string | null> {
    return this.run(() => this.client.get(key));
  }

  set(key: string, value: string, ttlMs?: number): Promise<void> {
    return this.run(async () => {
      if (ttlMs === undefined) {
        await this.client.set(key, value);
        return;
      }
      const ttl = Math.trunc(ttlMs);
      if (ttl <= 0) {
        await this.client.del(key);
        return;
      }
      await this.client.send('SET', [key, value, 'PX', String(ttl)]);
    });
  }

  incrBy(key: string, amount: number): Promise<number> {
    return this.run(async () =>
      Number(await this.client.send('INCRBY', [key, String(Math.trunc(amount))])),
    );
  }

  zadd(key: string, score: number, member: string): Promise<void> {
    return this.run(async () => {
      await this.client.zadd(key, score, member);
    });
  }

  zrange(key: string, start: number, stop: number, reverse = false): Promise<SortedEntry[]> {
    return this.run(async () => {
      const options = reverse ? ['REV', 'WITHSCORES'] : ['WITHSCORES'];
      return parseRange(await this.client.zrange(key, start, stop, ...options));
    });
  }

  zscore(key: string, member: string): Promise<number | null> {
    return this.run(async () => {
      const score = await this.client.zscore(key, member);
      return score === null || score === undefined ? null : Number(score);
    });
  }

  zrank(key: string, member: string, reverse = false): Promise<number | null> {
    return this.run(async () => {
      const rank = reverse
        ? await this.client.send('ZREVRANK', [key, member])
        : await this.client.zrank(key, member);
      return rank === null || rank === undefined ? null : Number(rank);
    });
  }

  del(key: string): Promise<void> {
    return this.run(async () => {
      await this.client.del(key);
    });
  }

  zincrBy(key: string, amount: number, member: string): Promise<number> {
    return this.run(async () => Number(await this.client.zincrby(key, amount, member)));
  }

  update<T>(
    keys: string[],
    fn: (current: Record<string, string | null>) => StoreUpdate<T>,
  ): Promise<T> {
    return this.run(async () => {
      for (let attempt = 0; attempt < UPDATE_ATTEMPTS; attempt++) {
        if (keys.length > 0) await this.client.send('WATCH', keys);
        let plan: StoreUpdate<T>;
        try {
          const current: Record<string, string | null> = {};
          if (keys.length > 0) {
            const values = (await this.client.send('MGET', keys)) as Array<string | null>;
            keys.forEach((key, index) => {
              current[key] = values[index] ?? null;
            });
          }
          plan = fn(current);
        } catch (error) {
          if (keys.length > 0) await this.client.send('UNWATCH', []);
          throw error;
        }
        await this.client.send('MULTI', []);
        for (const [key, value] of Object.entries(plan.writes ?? {})) {
          if (value === null) await this.client.send('DEL', [key]);
          else await this.client.send('SET', [key, value, 'KEEPTTL']);
        }
        for (const entry of plan.zadds ?? []) {
          await this.client.send('ZADD', [entry.key, String(entry.score), entry.member]);
        }
        const executed = await this.client.send('EXEC', []);
        if (executed !== null) return plan.result;
        // Another process touched a watched key; jitter and try again.
        await Bun.sleep(1 + Math.floor(Math.random() * 3));
      }
      throw new Error('RedisStore.update: too many concurrent conflicts');
    });
  }

  /** Serialize store operations so a transaction cannot interleave with them. */
  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

/**
 * ZRANGE WITHSCORES resolves as [member, score] pairs — Bun's client and the
 * test fake both reply that way; the port wants SortedEntry objects.
 */
function parseRange(raw: unknown): SortedEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((pair) => {
    const values = pair as unknown[];
    return { member: String(values[0]), score: Number(values[1]) };
  });
}
