import { getBalance } from '@discord.ts/systems';
import { parseAmount } from '@discord.ts/utils';
import { MessageFlags } from 'discord.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';

export interface Repliable {
  reply(options: unknown): Promise<unknown>;
}

export async function replyEphemeral(target: Repliable, content: string): Promise<void> {
  await target.reply({ content, flags: MessageFlags.Ephemeral });
}

/** Parse a bet against the caller's balance. Replies and returns null when invalid. */
export async function readBet(
  ctx: Repliable & { user: { id: string } },
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
