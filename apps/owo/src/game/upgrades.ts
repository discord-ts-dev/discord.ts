import type { Store } from '@discord.ts/systems';
import { RARITIES, type Rarity } from './roster.js';

export const UPGRADE_MAX_LEVEL = 10;
export const UPGRADE_BASE_COST = 1000;

const levelKey = (userId: string) => `upgrade:${userId}`;

/** Next-level price: 1000 * (level+1)^2. Level 0 costs 1000, level 1 costs 4000. */
export function upgradeCost(level: number): number {
  return UPGRADE_BASE_COST * (level + 1) ** 2;
}

/** Hunt success chance with the upgrade bonus, hard-capped at 90%. */
export function huntChance(base: number, level: number): number {
  return Math.min(0.9, base + level * 0.01);
}

/** Sacrificing pays xp instead of coins: a tenth of the sell price per rarity. */
export function sacrificeXp(rarity: Rarity): number {
  return RARITIES[rarity].sellPrice / 10;
}

export async function upgradeLevel(store: Store, userId: string): Promise<number> {
  return Number((await store.get(levelKey(userId))) ?? 0) || 0;
}

export async function setUpgradeLevel(store: Store, userId: string, level: number): Promise<void> {
  if (level <= 0) await store.del(levelKey(userId));
  else await store.set(levelKey(userId), String(level));
}
