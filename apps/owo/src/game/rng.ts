import { RARITIES, ROSTER, type Animal, type Rarity } from './roster.js';

export type Rand = () => number;

export function rollCatch(chance: number, rand: Rand = Math.random): boolean {
  return rand() < chance;
}

export function pickRarity(rand: Rand = Math.random): Rarity {
  const tiers = Object.entries(RARITIES) as [Rarity, { weight: number }][];
  const total = tiers.reduce((sum, [, def]) => sum + def.weight, 0);
  let roll = rand() * total;
  for (const [rarity, def] of tiers) {
    roll -= def.weight;
    if (roll < 0) return rarity;
  }
  return (tiers.at(-1) as [Rarity, unknown])[0];
}

export function pickAnimal(rand: Rand = Math.random, roster: Animal[] = ROSTER): Animal {
  const rarity = pickRarity(rand);
  const pool = roster.filter((a) => a.rarity === rarity);
  const from = pool.length ? pool : roster;
  return from[Math.floor(rand() * from.length)] as Animal;
}

export type CoinSide = 'heads' | 'tails';

export function flip(rand: Rand = Math.random): CoinSide {
  return rand() < 0.5 ? 'heads' : 'tails';
}

/** Level curve: level L starts at 50 * (L-1)^2 xp. */
export const XP_PER_LEVEL = 50;

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / XP_PER_LEVEL)) + 1;
}

export function xpForLevel(level: number): number {
  return XP_PER_LEVEL * (level - 1) ** 2;
}

export function xpToNext(xp: number): { level: number; into: number; need: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, need: next - base };
}
