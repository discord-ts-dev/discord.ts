import { defineTask, getBalance, type Store } from '@discord.ts/systems';
import { GAME } from './config.js';
import { credit } from './economy.js';
import { store as appStore } from './store.js';

export interface LotteryTicket {
  userId: string;
  count: number;
}

export interface LotteryState {
  pot: number;
  tickets: Record<string, number>;
  last: { winner: string; pot: number } | null;
}

const STATE_KEY = 'lottery:state';

export async function lotteryState(store: Store): Promise<LotteryState> {
  const raw = await store.get(STATE_KEY);
  if (!raw) return { pot: 0, tickets: {}, last: null };
  return { pot: 0, tickets: {}, last: null, ...(JSON.parse(raw) as Partial<LotteryState>) };
}

async function save(store: Store, state: LotteryState): Promise<void> {
  await store.set(STATE_KEY, JSON.stringify(state));
}

/** Weighted pick: a player's chance is their ticket share. */
export function drawWinner(
  tickets: LotteryTicket[],
  rand: () => number = Math.random,
): string | null {
  const entries = tickets.filter((t) => t.count > 0);
  const total = entries.reduce((sum, t) => sum + t.count, 0);
  if (total <= 0) return null;
  let roll = rand() * total;
  for (const entry of entries) {
    roll -= entry.count;
    if (roll < 0) return entry.userId;
  }
  return (entries[entries.length - 1] as LotteryTicket).userId;
}

export type BuyResult =
  | { ok: true; balance: number; pot: number }
  | { ok: false; reason: 'invalid-count' | 'insufficient-funds'; balance: number; pot: number };

export async function buyTickets(
  store: Store,
  userId: string,
  count: number,
  price: number = GAME.lotteryTicketPrice,
): Promise<BuyResult> {
  const state = await lotteryState(store);
  const balance = await getBalance(store, userId);
  if (!Number.isInteger(count) || count <= 0) {
    return { ok: false, reason: 'invalid-count', balance, pot: state.pot };
  }
  const cost = count * price;
  if (balance < cost) {
    return { ok: false, reason: 'insufficient-funds', balance, pot: state.pot };
  }
  const next = await credit(store, userId, -cost);
  state.pot += cost;
  state.tickets[userId] = (state.tickets[userId] ?? 0) + count;
  await save(store, state);
  return { ok: true, balance: next, pot: state.pot };
}

/** Pay the pot to a weighted winner and start a fresh round. */
export async function drawLottery(
  store: Store,
  rand: () => number = Math.random,
): Promise<{ winner: string; pot: number } | null> {
  const state = await lotteryState(store);
  const tickets = Object.entries(state.tickets).map(([userId, count]) => ({ userId, count }));
  const winner = state.pot > 0 ? drawWinner(tickets, rand) : null;
  if (!winner) return null;
  await credit(store, winner, state.pot);
  await save(store, { pot: 0, tickets: {}, last: { winner, pot: state.pot } });
  return { winner, pot: state.pot };
}

export const lotteryTask = defineTask({
  name: 'owo-lottery-draw',
  everyMs: GAME.lotteryIntervalMs,
  run: async () => {
    await drawLottery(appStore);
  },
});
