import { getBalance, type Store } from '@discord.ts/systems';
import { credit } from './economy.js';

export const BEE_PRICE = 500;
export const HONEY_PRICE = 5;
export const HONEY_PER_BEE_PER_HOUR = 10;
export const HONEY_CAP_PER_BEE = 50;

export interface Hive {
  bees: number;
  honey: number;
  /** Last settle timestamp. */
  at: number;
}

const hiveKey = (userId: string) => `hive:${userId}`;

export async function hiveOf(store: Store, userId: string): Promise<Hive> {
  const raw = await store.get(hiveKey(userId));
  if (!raw) return { bees: 0, honey: 0, at: Date.now() };
  return JSON.parse(raw) as Hive;
}

/** Honey after elapsed time, capped per bee. Pure so the math stays testable. */
export function accruedHoney(hive: Hive, now: number): number {
  if (hive.bees <= 0) return hive.honey;
  const hours = Math.max(0, (now - hive.at) / 3_600_000);
  const produced = hive.bees * HONEY_PER_BEE_PER_HOUR * hours;
  return Math.min(hive.bees * HONEY_CAP_PER_BEE, hive.honey + produced);
}

export async function buyBee(
  store: Store,
  userId: string,
): Promise<{ ok: true; bees: number } | { ok: false; reason: 'insufficient-funds' }> {
  const balance = await getBalance(store, userId);
  if (balance < BEE_PRICE) return { ok: false, reason: 'insufficient-funds' };
  const hive = await hiveOf(store, userId);
  hive.honey = accruedHoney(hive, Date.now());
  hive.bees += 1;
  hive.at = Date.now();
  await credit(store, userId, -BEE_PRICE);
  await store.set(hiveKey(userId), JSON.stringify(hive));
  return { ok: true, bees: hive.bees };
}

/** Settle accrual into stored honey. Returns what was collected this call. */
export async function collectHoney(
  store: Store,
  userId: string,
  now: number = Date.now(),
): Promise<{ hive: Hive; collected: number }> {
  const hive = await hiveOf(store, userId);
  const total = accruedHoney(hive, now);
  const collected = Math.floor(total - hive.honey);
  hive.honey = total;
  hive.at = now;
  await store.set(hiveKey(userId), JSON.stringify(hive));
  return { hive, collected: Math.max(0, collected) };
}

export async function sellHoney(
  store: Store,
  userId: string,
): Promise<{ collected: number; coins: number }> {
  const { hive } = await collectHoney(store, userId);
  const honeySold = Math.floor(hive.honey);
  const coins = honeySold * HONEY_PRICE;
  if (coins > 0) await credit(store, userId, coins);
  hive.honey = 0;
  await store.set(hiveKey(userId), JSON.stringify(hive));
  return { collected: honeySold, coins };
}
