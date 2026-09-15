import { addBalance } from './shop.js';
import type { Store } from './store.js';

export async function awardVote(store: Store, userId: string, amount: number): Promise<number> {
  await store.set(`vote:${userId}`, String(Date.now()));
  return addBalance(store, userId, amount);
}
