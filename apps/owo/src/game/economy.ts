import { addBalance, type Store } from '@discord.ts/systems';
import { RARITIES, ROSTER } from './roster.js';

export const XP_BOARD = 'xp';
export const WEALTH_BOARD = 'wealth';
export const ZOO_BOARD = 'zoo';

// ponytail: every pawcoin path goes through credit(), so the wealth board can
// be mirrored in the same atomic update as the balance rather than drifting.
export async function credit(store: Store, userId: string, amount: number): Promise<number> {
  return addBalance(store, userId, amount, { mirrorBoard: WEALTH_BOARD });
}

export interface SaleResult {
  sold: number;
  proceeds: number;
}

/** Price a sell of up to `count` of one species against what the zoo holds. */
export function sellCount(
  zoo: Record<string, number>,
  animalId: string,
  count: number,
): SaleResult {
  const animal = ROSTER.find((a) => a.id === animalId);
  const have = zoo[animalId] ?? 0;
  if (!animal || have <= 0 || count <= 0) return { sold: 0, proceeds: 0 };
  const sold = Math.min(Math.floor(count), have);
  return { sold, proceeds: sold * RARITIES[animal.rarity].sellPrice };
}
