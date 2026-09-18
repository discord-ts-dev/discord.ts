import { addScore, rankOf, type Store } from '@discord.ts/systems';
import { ZOO_BOARD } from './economy.js';

const zooKey = (userId: string) => `zoo:${userId}`;

export async function getZoo(store: Store, userId: string): Promise<Record<string, number>> {
  return JSON.parse((await store.get(zooKey(userId))) ?? '{}') as Record<string, number>;
}

export async function addAnimal(
  store: Store,
  userId: string,
  animalId: string,
  qty = 1,
): Promise<number> {
  const zoo = await getZoo(store, userId);
  const next = (zoo[animalId] ?? 0) + qty;
  zoo[animalId] = next;
  await setZoo(store, userId, zoo);
  return next;
}

/** Replace the collection and rescore the zoo board (board score = total animals). */
export async function setZoo(
  store: Store,
  userId: string,
  zoo: Record<string, number>,
): Promise<void> {
  await store.set(zooKey(userId), JSON.stringify(zoo));
  const prev = (await rankOf(store, ZOO_BOARD, userId))?.score ?? 0;
  await addScore(store, ZOO_BOARD, userId, zooTotals(zoo).total - prev);
}

export function zooTotals(zoo: Record<string, number>): { total: number; unique: number } {
  const counts = Object.values(zoo);
  return {
    total: counts.reduce((sum, n) => sum + n, 0),
    unique: counts.filter((n) => n > 0).length,
  };
}
