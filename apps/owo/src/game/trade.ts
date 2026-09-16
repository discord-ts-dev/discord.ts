import { buy, inventory, useItem, type Store } from '@discord.ts/systems';

export interface TradeOffer {
  id: string;
  from: string;
  to: string;
  itemId: string;
  qty: number;
}

export type TradeAcceptResult =
  | { ok: true }
  | { ok: false; reason: 'not-yours' | 'expired' | 'no-item' };

export const TRADE_TTL_MS = 10 * 60_000;

const tradeKey = (id: string) => `trade:${id}`;

export async function proposeTrade(
  store: Store,
  id: string,
  from: string,
  to: string,
  itemId: string,
  qty: number,
  ttlMs: number = TRADE_TTL_MS,
): Promise<{ ok: true } | { ok: false; reason: 'no-item' }> {
  const bag = await inventory(store, from);
  if ((bag[itemId] ?? 0) < qty) return { ok: false, reason: 'no-item' };
  const offer: TradeOffer = { id, from, to, itemId, qty };
  await store.set(tradeKey(id), JSON.stringify(offer), ttlMs);
  return { ok: true };
}

export async function getTrade(store: Store, id: string): Promise<TradeOffer | null> {
  const raw = await store.get(tradeKey(id));
  return raw ? (JSON.parse(raw) as TradeOffer) : null;
}

export async function cancelTrade(store: Store, id: string): Promise<void> {
  await store.del(tradeKey(id));
}

/** Receiver accepts: move the items, delete the offer. */
// ponytail: two store writes (remove, grant). A crash between them loses the
// item; single-flush transactions are the fix when the Store port grows them.
export async function acceptTrade(
  store: Store,
  id: string,
  by: string,
): Promise<TradeAcceptResult> {
  const offer = await getTrade(store, id);
  if (!offer) return { ok: false, reason: 'expired' };
  if (offer.to !== by) return { ok: false, reason: 'not-yours' };
  if (!(await useItem(store, offer.from, offer.itemId, offer.qty))) {
    await store.del(tradeKey(id));
    return { ok: false, reason: 'no-item' };
  }
  await buy(store, offer.to, { id: offer.itemId, price: 0 }, offer.qty);
  await store.del(tradeKey(id));
  return { ok: true };
}
