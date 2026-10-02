import type { Store } from './store.js';
import { keys } from './keys.js';
import { adopt } from './prototype-free.js';

export interface ShopItem {
  id: string;
  price: number;
}

export type BuyResult =
  | { ok: true; balance: number; qty: number }
  | { ok: false; reason: 'invalid-qty' | 'insufficient-funds'; balance: number };

/** Keep a sorted-set board equal to the new balance, in the same atomic write. */
export interface MirrorOptions {
  mirrorBoard?: string;
}

// An item id is a component-button custom id, so it is caller-chosen. A parsed
// object is a plain `{}`, where writing `__proto__` re-parents the inventory
// instead of stocking an item (ADR 0016). Copying through `adopt` makes any id
// an ordinary key and keeps the value plain JSON, as stored.
function parseInv(raw: string | null): Record<string, number> {
  return adopt(raw === null ? undefined : (JSON.parse(raw) as Record<string, number>));
}

export async function getBalance(store: Store, userId: string): Promise<number> {
  return Number((await store.get(keys.balance(userId))) ?? 0) || 0;
}

export async function addBalance(
  store: Store,
  userId: string,
  amount: number,
  opts: MirrorOptions = {},
): Promise<number> {
  const balanceKey = keys.balance(userId);
  return store.update([balanceKey], (current) => {
    const next = (Number(current[balanceKey] ?? 0) || 0) + amount;
    return {
      result: next,
      writes: { [balanceKey]: String(next) },
      zadds: opts.mirrorBoard
        ? [{ key: keys.leaderboard(opts.mirrorBoard), score: next, member: userId }]
        : undefined,
    };
  });
}

export async function buy(
  store: Store,
  userId: string,
  item: ShopItem,
  qty = 1,
  opts: MirrorOptions = {},
): Promise<BuyResult> {
  const balanceKey = keys.balance(userId);
  const inventoryKey = keys.inventory(userId);
  return store.update<BuyResult>([inventoryKey, balanceKey], (current) => {
    const balance = Number(current[balanceKey] ?? 0) || 0;
    if (!Number.isInteger(qty) || qty <= 0)
      return { result: { ok: false, reason: 'invalid-qty', balance } };
    const cost = item.price * qty;
    if (balance < cost) return { result: { ok: false, reason: 'insufficient-funds', balance } };
    const inv = parseInv(current[inventoryKey]);
    inv[item.id] = (inv[item.id] ?? 0) + qty;
    const next = balance - cost;
    return {
      result: { ok: true, balance: next, qty: inv[item.id] as number },
      writes: { [inventoryKey]: JSON.stringify(inv), [balanceKey]: String(next) },
      zadds: opts.mirrorBoard
        ? [{ key: keys.leaderboard(opts.mirrorBoard), score: next, member: userId }]
        : undefined,
    };
  });
}

export async function inventory(store: Store, userId: string): Promise<Record<string, number>> {
  // Spread back to an ordinary object: `parseInv` returns a prototype-free one
  // so writing through it is safe, but callers get a plain `Record` and lose
  // nothing (`hasOwnProperty`, `toString`). Spreading copies own keys only and
  // defines `__proto__` as an own data property, so an adversarial name stays
  // a name instead of re-parenting the caller's object.
  return { ...parseInv(await store.get(keys.inventory(userId))) };
}

/** Whether a stored count covers a request. A missing key is 0, never `undefined`. */
function hasStock(held: number | undefined, qty: number): boolean {
  return (held ?? 0) >= qty;
}

export async function useItem(
  store: Store,
  userId: string,
  itemId: string,
  qty = 1,
): Promise<boolean> {
  if (!Number.isInteger(qty) || qty <= 0) return false;
  const inventoryKey = keys.inventory(userId);
  return store.update<boolean>([inventoryKey], (current) => {
    const inv = parseInv(current[inventoryKey]);
    if (hasStock(inv[itemId], qty) === false) return { result: false };
    inv[itemId] = (inv[itemId] ?? 0) - qty;
    if (inv[itemId] === 0) delete inv[itemId];
    return { result: true, writes: { [inventoryKey]: JSON.stringify(inv) } };
  });
}
