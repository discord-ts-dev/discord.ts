import type { Store } from '@discord.ts/systems';

export interface DropState {
  amount: number;
  createdAt: number;
}

export const DROP_TTL_MS = 60_000;

const key = (channelId: string) => `drop:${channelId}`;

// ponytail: in-process claim gate, synchronous so two clicks cannot both win.
// Multi-process shards need a store-level compare-and-set instead.
const claims = new Set<string>();

/** Test seam: forget which channels were claimed in this process. */
export function resetClaims(): void {
  claims.clear();
}

export async function createDrop(
  store: Store,
  channelId: string,
  amount: number,
  ttlMs: number = DROP_TTL_MS,
): Promise<DropState> {
  claims.delete(channelId);
  const state: DropState = { amount, createdAt: Date.now() };
  await store.set(key(channelId), JSON.stringify(state), ttlMs);
  return state;
}

export async function getDrop(store: Store, channelId: string): Promise<DropState | null> {
  const raw = await store.get(key(channelId));
  return raw ? (JSON.parse(raw) as DropState) : null;
}

export type ClaimResult = { ok: true; amount: number } | { ok: false; reason: 'gone' | 'taken' };

export async function claimDrop(store: Store, channelId: string): Promise<ClaimResult> {
  if (claims.has(channelId)) return { ok: false, reason: 'taken' };
  // Claim before the first await: two clicks cannot both pass this check.
  claims.add(channelId);
  const state = await getDrop(store, channelId);
  if (!state) {
    claims.delete(channelId);
    return { ok: false, reason: 'gone' };
  }
  await store.del(key(channelId));
  return { ok: true, amount: state.amount };
}
