import { buy } from '@discord.ts/systems';
import { WEALTH_BOARD } from '../game/economy.js';
import { premiumTierOf, shopPrice } from '../game/premium.js';
import { store } from '../game/store.js';

export interface PurchaseItem {
  id: string;
  name: string;
  price: number;
}

export type PurchaseResult =
  | { ok: true; price: number; balance: number }
  | { ok: false; price: number; balance: number };

/** Buy an item at the caller's premium price and mirror the wealth board. */
export async function purchase(
  ctx: { user: { id: string } },
  item: PurchaseItem,
): Promise<PurchaseResult> {
  const tier = await premiumTierOf(store, ctx.user.id);
  const price = shopPrice(item.price, tier);
  const result = await buy(store, ctx.user.id, { id: item.id, price }, 1, {
    mirrorBoard: WEALTH_BOARD,
  });
  if (!result.ok) return { ok: false, price, balance: result.balance };
  return { ok: true, price, balance: result.balance };
}
