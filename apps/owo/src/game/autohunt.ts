import { addScore, defineTask, getBalance, type Store } from '@discord.ts/systems';
import { GAME } from './config.js';
import { credit, XP_BOARD } from './economy.js';
import { pickAnimal, rollCatch } from './rng.js';
import { store as appStore } from './store.js';
import { huntChance, upgradeLevel } from './upgrades.js';
import { getZoo, setZoo } from './zoo.js';

export const AUTOHUNT_PRICE = 250;
export const AUTOHUNT_INTERVAL_MS = 5 * 60_000;
export const AUTOHUNT_MAX_CHARGES = 24;

export interface AutohuntState {
  charges: number;
  at: number;
}

const stateKey = (userId: string) => `autohunt:${userId}`;
const USERS_KEY = 'autohunt:users';

export async function autohuntState(store: Store, userId: string): Promise<AutohuntState> {
  const raw = await store.get(stateKey(userId));
  if (!raw) return { charges: 0, at: Date.now() };
  return JSON.parse(raw) as AutohuntState;
}

/** Whole hunts owed since the last run, capped by remaining charges. */
export function huntsDue(charges: number, lastAt: number, now: number): number {
  if (charges <= 0) return 0;
  return Math.min(charges, Math.floor(Math.max(0, now - lastAt) / AUTOHUNT_INTERVAL_MS));
}

async function autohuntUsers(store: Store): Promise<string[]> {
  const raw = await store.get(USERS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function buyAutohunt(
  store: Store,
  userId: string,
  count: number,
  now: number = Date.now(),
): Promise<
  | { ok: true; charges: number; bought: number }
  | { ok: false; reason: 'insufficient-funds' | 'at-cap' }
> {
  // Settle due ticks first: buying must not reset an almost-mature timer.
  await runAutohunt(store, userId, now);
  const state = await autohuntState(store, userId);
  const room = AUTOHUNT_MAX_CHARGES - state.charges;
  const bought = Math.min(count, room);
  if (bought <= 0) return { ok: false, reason: 'at-cap' };
  const cost = bought * AUTOHUNT_PRICE;
  const balance = await getBalance(store, userId);
  if (balance < cost) return { ok: false, reason: 'insufficient-funds' };
  await credit(store, userId, -cost);
  const charges = state.charges + bought;
  await store.set(stateKey(userId), JSON.stringify({ charges, at: now }));
  const users = new Set(await autohuntUsers(store));
  users.add(userId);
  await store.set(USERS_KEY, JSON.stringify([...users]));
  return { ok: true, charges, bought };
}

/** Spend due charges: catch animals and grant xp, exactly like manual hunts. */
export async function runAutohunt(
  store: Store,
  userId: string,
  now: number = Date.now(),
  rand: () => number = Math.random,
): Promise<{ hunts: number; caught: number }> {
  const state = await autohuntState(store, userId);
  const hunts = huntsDue(state.charges, state.at, now);
  if (hunts <= 0) return { hunts: 0, caught: 0 };

  const level = await upgradeLevel(store, userId);
  const chance = huntChance(GAME.catchChance, level);

  // Rolls run in memory; the zoo is written once so reads cannot race.
  let caught = 0;
  const zoo = await getZoo(store, userId);
  for (let i = 0; i < hunts; i++) {
    if (!rollCatch(chance, rand)) continue;
    const animal = pickAnimal(rand);
    zoo[animal.id] = (zoo[animal.id] ?? 0) + 1;
    caught++;
  }
  if (caught > 0) {
    await setZoo(store, userId, zoo);
    await addScore(store, XP_BOARD, userId, caught * GAME.huntXp);
  }
  await store.set(stateKey(userId), JSON.stringify({ charges: state.charges - hunts, at: now }));
  return { hunts, caught };
}

export const autohuntTask = defineTask({
  name: 'owo-autohunt-tick',
  everyMs: AUTOHUNT_INTERVAL_MS,
  run: async () => {
    const users = await autohuntUsers(appStore);
    await Promise.all(users.map((userId) => runAutohunt(appStore, userId)));
  },
});
