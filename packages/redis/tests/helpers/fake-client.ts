// In-memory Redis subset covering exactly the commands RedisStore uses.
// Test-only; the real-Redis integration suite is the source of truth for
// semantics (see integration.test.ts). Typed methods delegate to send() so
// the two call styles cannot drift apart.
import type { RedisClientLike } from '../../src/index.js';

interface Entry {
  value: string;
  expiresAt?: number;
}

interface Queued {
  command: string;
  args: string[];
}

export class FakeRedisClient implements RedisClientLike {
  constructor() {}

  /** Command log, one line per call, for interleaving assertions. */
  readonly commands: string[] = [];
  /** EXEC failures left to simulate before the next attempt succeeds. */
  conflictsToForce = 0;
  /** Set by close(); RedisStore must only call it for clients it owns. */
  closed = false;

  private readonly strings = new Map<string, Entry>();
  private readonly sorted = new Map<string, Map<string, number>>();
  private readonly versions = new Map<string, number>();
  private watched = new Map<string, number>();
  private queue: Queued[] | null = null;

  async get(key: string): Promise<string | null> {
    return (await this.send('GET', [key])) as string | null;
  }

  async set(key: string, value: string): Promise<unknown> {
    return this.send('SET', [key, value]);
  }

  async del(key: string): Promise<unknown> {
    return this.send('DEL', [key]);
  }

  async zadd(key: string, score: number, member: string): Promise<unknown> {
    return this.send('ZADD', [key, String(score), member]);
  }

  async zrange(key: string, start: number, stop: number, ...options: string[]): Promise<unknown> {
    return this.send('ZRANGE', [key, String(start), String(stop), ...options]);
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return (await this.send('ZRANK', [key, member])) as number | null;
  }

  async zscore(key: string, member: string): Promise<number | null> {
    return (await this.send('ZSCORE', [key, member])) as number | null;
  }

  async zincrby(key: string, amount: number, member: string): Promise<unknown> {
    return this.send('ZINCRBY', [key, String(amount), member]);
  }

  async send(command: string, args: string[]): Promise<unknown> {
    this.commands.push(args.length ? `${command} ${args.join(' ')}` : command);
    switch (command) {
      case 'WATCH':
        this.watched = new Map(args.map((key) => [key, this.version(key)]));
        return 'OK';
      case 'UNWATCH':
        this.watched.clear();
        return 'OK';
      case 'MULTI':
        this.queue = [];
        return 'OK';
      case 'EXEC': {
        const queued = this.queue ?? [];
        this.queue = null;
        if (this.conflictsToForce > 0) {
          this.conflictsToForce -= 1;
          this.watched.clear();
          return null;
        }
        const conflict = [...this.watched].some(([key, version]) => this.version(key) !== version);
        this.watched.clear();
        if (conflict) return null;
        return queued.map((entry) => this.apply(entry.command, entry.args));
      }
      default:
        if (this.queue) {
          this.queue.push({ command, args });
          return 'QUEUED';
        }
        return this.apply(command, args);
    }
  }

  close(): void {
    this.closed = true;
  }

  private version(key: string): number {
    return this.versions.get(key) ?? 0;
  }

  private touch(key: string): void {
    this.versions.set(key, this.version(key) + 1);
  }

  private read(key: string): string | null {
    const entry = this.strings.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.strings.delete(key);
      return null;
    }
    return entry.value;
  }

  private ordered(key: string, reverse: boolean): Array<{ member: string; score: number }> {
    const set = this.sorted.get(key);
    if (!set) return [];
    const list = [...set.entries()].map(([member, score]) => ({ member, score }));
    list.sort((a, b) =>
      a.score === b.score ? a.member.localeCompare(b.member) : a.score - b.score,
    );
    return reverse ? list.reverse() : list;
  }

  private setScore(key: string, score: number, member: string): void {
    let set = this.sorted.get(key);
    if (!set) this.sorted.set(key, (set = new Map()));
    set.set(member, score);
  }

  private apply(command: string, args: string[]): unknown {
    switch (command) {
      case 'GET':
        return this.read(args[0] ?? '');
      case 'SET': {
        const [key = '', value = '', ...options] = args;
        const pxAt = options.indexOf('PX');
        const previous = this.strings.get(key)?.expiresAt;
        if (pxAt >= 0) {
          this.strings.set(key, { value, expiresAt: Date.now() + Number(options[pxAt + 1]) });
        } else if (options.includes('KEEPTTL') && previous !== undefined) {
          this.strings.set(key, { value, expiresAt: previous });
        } else {
          this.strings.set(key, { value });
        }
        this.touch(key);
        return 'OK';
      }
      case 'DEL': {
        for (const key of args) {
          this.strings.delete(key);
          this.sorted.delete(key);
          this.touch(key);
        }
        return args.length;
      }
      case 'INCRBY': {
        const [key = '', amount = '0'] = args;
        const entry = this.strings.get(key);
        const next = Math.trunc((Number(entry?.value ?? 0) || 0) + Number(amount));
        this.strings.set(
          key,
          entry?.expiresAt === undefined
            ? { value: String(next) }
            : { value: String(next), expiresAt: entry.expiresAt },
        );
        this.touch(key);
        return next;
      }
      case 'MGET':
        return args.map((key) => this.read(key));
      case 'ZADD': {
        const [key = '', score = '0', member = ''] = args;
        this.setScore(key, Number(score), member);
        this.touch(key);
        return 1;
      }
      case 'ZINCRBY': {
        const [key = '', amount = '0', member = ''] = args;
        const next = (this.sorted.get(key)?.get(member) ?? 0) + Number(amount);
        this.setScore(key, next, member);
        this.touch(key);
        return next;
      }
      case 'ZRANGE': {
        const [key = '', start = '0', stop = '-1', ...options] = args;
        const list = this.ordered(key, options.includes('REV'));
        const from = Number(start);
        const until = Number(stop);
        const end = until < 0 ? list.length + until + 1 : until + 1;
        const slice = list.slice(from, end);
        if (options.includes('WITHSCORES')) {
          return slice.map((entry) => [entry.member, entry.score]);
        }
        return slice.map((entry) => entry.member);
      }
      case 'ZRANK': {
        const [key = '', member = ''] = args;
        const index = this.ordered(key, false).findIndex((entry) => entry.member === member);
        return index < 0 ? null : index;
      }
      case 'ZREVRANK': {
        const [key = '', member = ''] = args;
        const index = this.ordered(key, true).findIndex((entry) => entry.member === member);
        return index < 0 ? null : index;
      }
      case 'ZSCORE': {
        const [key = '', member = ''] = args;
        return this.sorted.get(key)?.get(member) ?? null;
      }
      default:
        throw new Error(`FakeRedisClient: unsupported command ${command}`);
    }
  }
}
