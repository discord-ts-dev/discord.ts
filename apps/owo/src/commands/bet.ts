import { getBalance } from '@discord-ts-dev/systems';
import { parseAmount } from '@discord-ts-dev/utils';
import { replyEphemeral, type ReplyTarget } from '@discord-ts-dev/ux';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';

/** Parse a bet against the caller's balance. Replies and returns null when invalid. */
export async function readBet(
  ctx: ReplyTarget & { user: { id: string } },
  raw: string,
): Promise<number | null> {
  const balance = await getBalance(store, ctx.user.id);
  const parsed = parseAmount(raw, balance);
  if (!parsed.ok) {
    await replyEphemeral(ctx, tt(ctx, `game:bet.${parsed.reason}`, { balance: fmt(balance) }));
    return null;
  }
  return parsed.value;
}
