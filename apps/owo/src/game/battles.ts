import { defineTask, type Store } from '@discord.ts/systems';
import { credit } from './economy.js';
import { store as appStore } from './store.js';

export interface BattleIndexEntry {
  id: string;
  players: [string, string];
  bet: number;
  at: number;
}

export const BATTLE_TTL_MS = 10 * 60_000;

const INDEX_KEY = 'battles:index';

export async function battleIndex(store: Store): Promise<BattleIndexEntry[]> {
  const raw = await store.get(INDEX_KEY);
  return raw ? (JSON.parse(raw) as BattleIndexEntry[]) : [];
}

export async function indexBattle(store: Store, entry: BattleIndexEntry): Promise<void> {
  const entries = (await battleIndex(store)).filter((existing) => existing.id !== entry.id);
  entries.push(entry);
  await store.set(INDEX_KEY, JSON.stringify(entries));
}

export async function unindexBattle(store: Store, id: string): Promise<void> {
  const entries = (await battleIndex(store)).filter((entry) => entry.id !== id);
  await store.set(INDEX_KEY, JSON.stringify(entries));
}

export function expiredEntries(
  entries: BattleIndexEntry[],
  now: number,
  ttlMs: number,
): BattleIndexEntry[] {
  return entries.filter((entry) => now - entry.at > ttlMs);
}

/** Refund every stake whose battle ran out the clock. Returns how many were refunded. */
export async function refundExpired(store: Store, now: number = Date.now()): Promise<number> {
  const entries = await battleIndex(store);
  const expired = expiredEntries(entries, now, BATTLE_TTL_MS);
  if (!expired.length) return 0;
  await Promise.all(
    expired.flatMap((entry) => entry.players.map((player) => credit(store, player, entry.bet))),
  );
  const expiredIds = new Set(expired.map((entry) => entry.id));
  await store.set(INDEX_KEY, JSON.stringify(entries.filter((entry) => !expiredIds.has(entry.id))));
  return expired.length;
}

export const battleRefundTask = defineTask({
  name: 'owo-battle-refund',
  everyMs: 5 * 60_000,
  run: async () => {
    await refundExpired(appStore);
  },
});
