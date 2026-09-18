import type { SortedEntry, Store } from './store.js';
import { keys } from './keys.js';

export async function addScore(
  store: Store,
  board: string,
  member: string,
  amount: number,
): Promise<number> {
  return store.zincrBy(keys.leaderboard(board), amount, member);
}

export async function top(store: Store, board: string, limit: number): Promise<SortedEntry[]> {
  return store.zrange(keys.leaderboard(board), 0, limit - 1, true);
}

export async function rankOf(
  store: Store,
  board: string,
  member: string,
): Promise<{ rank: number; score: number } | null> {
  const key = keys.leaderboard(board);
  const [rank, score] = await Promise.all([
    store.zrank(key, member, true),
    store.zscore(key, member),
  ]);
  if (rank === null || score === null) return null;
  return { rank: rank + 1, score };
}
