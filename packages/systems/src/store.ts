// ponytail: lazy TTL. Expired keys die on read, no sweep timer.

export interface SortedEntry {
  member: string;
  score: number;
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
}

export class MemoryStore implements Store {
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
    const next = (Number(this.read(key) ?? 0) || 0) + amount;
    this.strings.set(key, { value: String(next) });
    return next;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    let set = this.sorted.get(key);
    if (!set) this.sorted.set(key, (set = new Map()));
    set.set(member, score);
  }

  private ordered(key: string, reverse: boolean): SortedEntry[] {
    const entries = [...(this.sorted.get(key)?.entries() ?? [])].map(([member, score]) => ({
      member,
      score,
    }));
    entries.sort((a, b) => (reverse ? b.score - a.score : a.score - b.score));
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
