import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SortedEntry, Store } from '@discord.ts/systems';

interface Entry {
  v: string;
  exp?: number;
}

interface Persisted {
  strings: Record<string, Entry>;
  sorted: Record<string, Record<string, number>>;
}

function load(file: string): Persisted {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Persisted>;
    return { strings: raw.strings ?? {}, sorted: raw.sorted ?? {} };
  } catch {
    return { strings: {}, sorted: {} };
  }
}

// ponytail: sync JSON file, whole-map flush per write. Swap for SQL/Redis when
// the file outgrows memory or more than one process writes.
export class FileStore implements Store {
  private state: Persisted;

  constructor(private readonly file: string) {
    this.state = load(file);
  }

  private flush(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state));
    fs.renameSync(tmp, this.file);
  }

  async get(key: string): Promise<string | null> {
    const hit = this.state.strings[key];
    if (!hit) return null;
    if (hit.exp !== undefined && hit.exp <= Date.now()) {
      delete this.state.strings[key];
      return null;
    }
    return hit.v;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.state.strings[key] =
      ttlMs === undefined ? { v: value } : { v: value, exp: Date.now() + ttlMs };
    this.flush();
  }

  async incrBy(key: string, amount: number): Promise<number> {
    const current = Number((await this.get(key)) ?? 0) || 0;
    const next = Math.trunc(current + amount);
    this.state.strings[key] = { v: String(next) };
    this.flush();
    return next;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    const set = (this.state.sorted[key] ??= {});
    set[member] = score;
    this.flush();
  }

  private ordered(key: string, reverse: boolean): SortedEntry[] {
    const entries = Object.entries(this.state.sorted[key] ?? {}).map(([member, score]) => ({
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

export const store: Store = new FileStore(
  process.env.OWO_DATA_FILE ?? path.resolve('data/owo.json'),
);
