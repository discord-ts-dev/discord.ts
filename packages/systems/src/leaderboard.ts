import type { SortedEntry, Store } from "./store.js";

const boardKey = (board: string) => `lb:${board}`;

export async function addScore(store: Store, board: string, member: string, amount: number): Promise<number> {
  const next = ((await store.zscore(boardKey(board), member)) ?? 0) + amount;
  await store.zadd(boardKey(board), next, member);
  return next;
}

export async function top(store: Store, board: string, limit: number): Promise<SortedEntry[]> {
  return store.zrange(boardKey(board), 0, limit - 1, true);
}

export async function rankOf(store: Store, board: string, member: string): Promise<{ rank: number; score: number } | null> {
  const [rank, score] = await Promise.all([
    store.zrank(boardKey(board), member, true),
    store.zscore(boardKey(board), member),
  ]);
  if (rank === null || score === null) return null;
  return { rank: rank + 1, score };
}
