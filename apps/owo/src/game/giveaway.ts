import { defineTask, type Store } from '@discord.ts/systems';
import { store as appStore } from './store.js';

export interface Giveaway {
  id: string;
  prize: string;
  winners: number;
  endsAt: number;
  hostId: string;
  channelId: string;
  entries: string[];
}

export interface GiveawayDraw {
  prize: string;
  winners: string[];
  winnerCount: number;
  entries: number;
}

const INDEX_KEY = 'giveaways:index';
const giveawayKey = (id: string) => `giveaway:${id}`;

export async function dueGiveaways(store: Store, now: number = Date.now()): Promise<Giveaway[]> {
  const raw = await store.get(INDEX_KEY);
  const ids = raw ? (JSON.parse(raw) as string[]) : [];
  const found = await Promise.all(ids.map((id) => giveawayOf(store, id)));
  return found.filter((g): g is Giveaway => g !== null && g.endsAt <= now);
}

export async function startGiveaway(
  store: Store,
  giveaway: Omit<Giveaway, 'entries'> & { entries?: string[] },
): Promise<void> {
  const full: Giveaway = { ...giveaway, entries: giveaway.entries ?? [] };
  await store.set(giveawayKey(full.id), JSON.stringify(full));
  const raw = await store.get(INDEX_KEY);
  const ids = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  ids.add(full.id);
  await store.set(INDEX_KEY, JSON.stringify([...ids]));
}

export async function giveawayOf(store: Store, id: string): Promise<Giveaway | null> {
  const raw = await store.get(giveawayKey(id));
  return raw ? (JSON.parse(raw) as Giveaway) : null;
}

async function save(store: Store, giveaway: Giveaway): Promise<void> {
  await store.set(giveawayKey(giveaway.id), JSON.stringify(giveaway));
}

export async function enterGiveaway(
  store: Store,
  id: string,
  userId: string,
  now: number = Date.now(),
): Promise<{ ok: true; entries: number } | { ok: false; reason: 'expired' | 'already' }> {
  const giveaway = await giveawayOf(store, id);
  if (!giveaway || giveaway.endsAt <= now) return { ok: false, reason: 'expired' };
  if (giveaway.entries.includes(userId)) return { ok: false, reason: 'already' };
  giveaway.entries.push(userId);
  await save(store, giveaway);
  return { ok: true, entries: giveaway.entries.length };
}

/** Unique winners, capped by the entrant pool. */
export function pickWinners(
  entrants: string[],
  count: number,
  rand: () => number = Math.random,
): string[] {
  const pool = [...entrants];
  const winners: string[] = [];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i++) {
    const index = Math.floor(rand() * pool.length);
    winners.push(pool.splice(index, 1)[0] as string);
  }
  return winners;
}

/** Pick winners and delete the giveaway, leaving the index alone. */
export async function drawGiveaway(
  store: Store,
  giveaway: Giveaway,
  rand: () => number = Math.random,
): Promise<GiveawayDraw> {
  const winners = pickWinners(giveaway.entries, giveaway.winners, rand);
  await store.del(giveawayKey(giveaway.id));
  return {
    prize: giveaway.prize,
    winners,
    winnerCount: giveaway.winners,
    entries: giveaway.entries.length,
  };
}

async function unindexGiveaways(store: Store, ids: string[]): Promise<void> {
  const remove = new Set(ids);
  const raw = await store.get(INDEX_KEY);
  const remaining = (raw ? (JSON.parse(raw) as string[]) : []).filter((id) => !remove.has(id));
  await store.set(INDEX_KEY, JSON.stringify(remaining));
}

/** Announce hook: the command layer registers what to do with each draw. */
export type DrawHandler = (giveaway: Giveaway, draw: GiveawayDraw) => void | Promise<void>;
let onDraw: DrawHandler | null = null;

export function setDrawHandler(handler: DrawHandler): void {
  onDraw = handler;
}

/** Draw every due giveaway, unindex them in one write, then announce each. */
export async function sweepGiveaways(store: Store): Promise<GiveawayDraw[]> {
  const due = await dueGiveaways(store);
  if (!due.length) return [];
  // Draws are independent; the index is updated once so parallel draws
  // cannot stomp each other's index write.
  const draws = await Promise.all(
    due.map(async (giveaway) => ({ giveaway, draw: await drawGiveaway(store, giveaway) })),
  );
  await unindexGiveaways(
    store,
    due.map((giveaway) => giveaway.id),
  );
  const handler = onDraw;
  if (handler) {
    await Promise.all(draws.map(({ giveaway, draw }) => handler(giveaway, draw)));
  }
  return draws.map(({ draw }) => draw);
}

export const giveawayTask = defineTask({
  name: 'owo-giveaway-sweep',
  everyMs: 60_000,
  run: async () => {
    await sweepGiveaways(appStore);
  },
});
