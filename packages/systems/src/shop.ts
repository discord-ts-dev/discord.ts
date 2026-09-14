import type { Store } from './store.js';

export interface ShopItem {
  id: string;
  price: number;
}

export type BuyResult =
  | { ok: true; balance: number; qty: number }
  | { ok: false; reason: 'invalid-qty' | 'insufficient-funds'; balance: number };

const balKey = (userId: string) => `bal:${userId}`;
const invKey = (userId: string) => `inv:${userId}`;

async function readInv(store: Store, userId: string): Promise<Record<string, number>> {
  return JSON.parse((await store.get(invKey(userId))) ?? '{}') as Record<string, number>;
}

export async function getBalance(store: Store, userId: string): Promise<number> {
  return Number((await store.get(balKey(userId))) ?? 0) || 0;
}

export async function addBalance(store: Store, userId: string, amount: number): Promise<number> {
  return store.incrBy(balKey(userId), amount);
}

// ponytail: check-then-act. Atomicity is the adapter's job; MemoryStore
// is single-process so sequential awaits never interleave here.
export async function buy(
  store: Store,
  userId: string,
  item: ShopItem,
  qty = 1,
): Promise<BuyResult> {
  const balance = await getBalance(store, userId);
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, reason: 'invalid-qty', balance };
  const cost = item.price * qty;
  if (balance < cost) return { ok: false, reason: 'insufficient-funds', balance };
  const inv = await readInv(store, userId);
  inv[item.id] = (inv[item.id] ?? 0) + qty;
  await store.set(invKey(userId), JSON.stringify(inv));
  const next = await store.incrBy(balKey(userId), -cost);
  return { ok: true, balance: next, qty: inv[item.id] as number };
}

export async function inventory(store: Store, userId: string): Promise<Record<string, number>> {
  return readInv(store, userId);
}

export async function useItem(
  store: Store,
  userId: string,
  itemId: string,
  qty = 1,
): Promise<boolean> {
  if (!Number.isInteger(qty) || qty <= 0) return false;
  const inv = await readInv(store, userId);
  if ((inv[itemId] ?? 0) < qty) return false;
  inv[itemId] = (inv[itemId] as number) - qty;
  if (inv[itemId] === 0) delete inv[itemId];
  await store.set(invKey(userId), JSON.stringify(inv));
  return true;
}
