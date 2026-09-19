// ponytail: lazy TTL. Expired keys die on read, no sweep timer.
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Token apps register their Store adapter under (ADR 0004). */
export const STORE = 'discord:store';

export interface SortedEntry {
  member: string;
  score: number;
}

/** Values written by one atomic update; null deletes the key. */
export type StoreWrites = Record<string, string | null>;

/** One atomic update: what the caller gets back plus the writes to apply. */
export interface StoreUpdate<T> {
  result: T;
  /** String values written atomically; null deletes. Existing TTLs are kept. */
  writes?: StoreWrites;
  /** Sorted-set scores written atomically, absolute like `zadd`. */
  zadds?: Array<{ key: string; score: number; member: string }>;
}

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  incrBy(key: string, amount: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrange(key: string, start: number, stop: number, reverse?: boolean): Promise<SortedEntry[]>;
  zscore(key: string, member: string): Promise<number | null>;
  zrank(key: string, member: string, reverse?: boolean): Promise<number | null>;
  del(key: string): Promise<void>;
  /** Atomic increment of one member's score. Returns the new score. */
  zincrBy(key: string, amount: number, member: string): Promise<number>;
  /**
   * Atomic read-modify-write over `keys`. `fn` runs once with the current
   * values (null when missing) and must be synchronous; its writes and zadds
   * apply together with no other update interleaving. Adapters serialize
   * concurrent updates that share keys.
   */
  update<T>(
    keys: string[],
    fn: (current: Record<string, string | null>) => StoreUpdate<T>,
  ): Promise<T>;
}

export class MemoryStore implements Store {
  constructor() {}
  private readonly strings = new Map<string, { value: string; expiresAt?: number }>();
  private readonly sorted = new Map<string, Map<string, number>>();

  private read(key: string): string | null {
    const hit = this.strings.get(key);
    if (!hit) return null;
    if (hit.expiresAt !== undefined && hit.expiresAt <= Date.now()) {
      this.strings.delete(key);
      return null;
    }
    return hit.value;
  }

  /** Write keeping the key's existing TTL; atomic-update semantics. */
  private write(key: string, value: string): void {
    const expiresAt = this.strings.get(key)?.expiresAt;
    this.strings.set(key, expiresAt === undefined ? { value } : { value, expiresAt });
  }

  private setScore(key: string, score: number, member: string): void {
    let set = this.sorted.get(key);
    if (!set) this.sorted.set(key, (set = new Map()));
    set.set(member, score);
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.strings.set(
      key,
      ttlMs === undefined ? { value } : { value, expiresAt: Date.now() + ttlMs },
    );
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.update([key], (current) => {
      const next = Math.trunc((Number(current[key] ?? 0) || 0) + amount);
      return { result: next, writes: { [key]: String(next) } };
    });
  }

  async update<T>(
    keys: string[],
    fn: (current: Record<string, string | null>) => StoreUpdate<T>,
  ): Promise<T> {
    const current: Record<string, string | null> = {};
    for (const key of keys) current[key] = this.read(key);
    const { result, writes, zadds } = fn(current);
    if (writes) {
      for (const [key, value] of Object.entries(writes)) {
        if (value === null) this.strings.delete(key);
        else this.write(key, value);
      }
    }
    if (zadds) for (const { key, score, member } of zadds) this.setScore(key, score, member);
    return result;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    this.setScore(key, score, member);
  }

  async zincrBy(key: string, amount: number, member: string): Promise<number> {
    const next = (this.sorted.get(key)?.get(member) ?? 0) + amount;
    this.setScore(key, next, member);
    return next;
  }

  private ordered(key: string, reverse: boolean): SortedEntry[] {
    const entries = [...(this.sorted.get(key)?.entries() ?? [])].map(([member, score]) => ({
      member,
      score,
    }));
    entries.sort((a, b) => {
      const byScore = reverse ? b.score - a.score : a.score - b.score;
      if (byScore !== 0) return byScore;
      return reverse ? b.member.localeCompare(a.member) : a.member.localeCompare(b.member);
    });
    return entries;
  }

  async zrange(key: string, start: number, stop: number, reverse = false): Promise<SortedEntry[]> {
    const entries = this.ordered(key, reverse);
    return entries.slice(start, stop < 0 ? entries.length + stop + 1 : stop + 1);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    return this.sorted.get(key)?.get(member) ?? null;
  }

  async zrank(key: string, member: string, reverse = false): Promise<number | null> {
    const i = this.ordered(key, reverse).findIndex((e) => e.member === member);
    return i < 0 ? null : i;
  }

  async del(key: string): Promise<void> {
    this.strings.delete(key);
    this.sorted.delete(key);
  }
}

interface FileEntry {
  v: string;
  exp?: number;
}

interface FilePersisted {
  strings: Record<string, FileEntry>;
  sorted: Record<string, Record<string, number>>;
}

function loadFile(file: string): FilePersisted {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<FilePersisted>;
    return { strings: raw.strings ?? {}, sorted: raw.sorted ?? {} };
  } catch {
    return { strings: {}, sorted: {} };
  }
}

// ponytail: sync JSON file, whole-map flush per write. Single process only.
// Swap for SQL/Redis when the file outgrows memory or more than one process writes.
export class FileStore implements Store {
  private state: FilePersisted;

  constructor(private readonly file: string) {
    this.state = loadFile(file);
  }

  private flush(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state));
    fs.renameSync(tmp, this.file);
  }

  private read(key: string): string | null {
    const hit = this.state.strings[key];
    if (!hit) return null;
    if (hit.exp !== undefined && hit.exp <= Date.now()) {
      delete this.state.strings[key];
      return null;
    }
    return hit.v;
  }

  /** Write keeping the key's existing TTL; atomic-update semantics. */
  private write(key: string, value: string): void {
    const exp = this.state.strings[key]?.exp;
    this.state.strings[key] = exp === undefined ? { v: value } : { v: value, exp };
  }

  private setScore(key: string, score: number, member: string): void {
    (this.state.sorted[key] ??= {})[member] = score;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.state.strings[key] =
      ttlMs === undefined ? { v: value } : { v: value, exp: Date.now() + ttlMs };
    this.flush();
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.update([key], (current) => {
      const next = Math.trunc((Number(current[key] ?? 0) || 0) + amount);
      return { result: next, writes: { [key]: String(next) } };
    });
  }

  async update<T>(
    keys: string[],
    fn: (current: Record<string, string | null>) => StoreUpdate<T>,
  ): Promise<T> {
    const current: Record<string, string | null> = {};
    for (const key of keys) current[key] = this.read(key);
    const { result, writes, zadds } = fn(current);
    if (writes) {
      for (const [key, value] of Object.entries(writes)) {
        if (value === null) delete this.state.strings[key];
        else this.write(key, value);
      }
    }
    if (zadds) for (const { key, score, member } of zadds) this.setScore(key, score, member);
    if (writes || zadds) this.flush();
    return result;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    this.setScore(key, score, member);
    this.flush();
  }

  async zincrBy(key: string, amount: number, member: string): Promise<number> {
    const next = (this.state.sorted[key]?.[member] ?? 0) + amount;
    this.setScore(key, next, member);
    this.flush();
    return next;
  }

  private ordered(key: string, reverse: boolean): SortedEntry[] {
    const entries = Object.entries(this.state.sorted[key] ?? {}).map(([member, score]) => ({
      member,
      score,
    }));
    entries.sort((a, b) => {
      const byScore = reverse ? b.score - a.score : a.score - b.score;
      if (byScore !== 0) return byScore;
      return reverse ? b.member.localeCompare(a.member) : a.member.localeCompare(b.member);
    });
    return entries;
  }

  async zrange(key: string, start: number, stop: number, reverse = false): Promise<SortedEntry[]> {
    const entries = this.ordered(key, reverse);
    return entries.slice(start, stop < 0 ? entries.length + stop + 1 : stop + 1);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    return this.state.sorted[key]?.[member] ?? null;
  }

  async zrank(key: string, member: string, reverse = false): Promise<number | null> {
    const i = this.ordered(key, reverse).findIndex((e) => e.member === member);
    return i === -1 ? null : i;
  }

  async del(key: string): Promise<void> {
    delete this.state.strings[key];
    delete this.state.sorted[key];
    this.flush();
  }
}
