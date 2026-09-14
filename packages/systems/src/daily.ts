import { dayIndex } from './scheduler.js';
import type { Store } from './store.js';

export interface ClaimOptions {
  amount: number;
  streakBonus?: number;
  streakGraceDays?: number;
  timeZone?: string;
  now?: Date;
}

export interface ClaimResult {
  claimed: boolean;
  amount: number;
  streak: number;
}

// ponytail: fixed key scheme. `bal:` is the same namespace shop uses,
// so daily payouts land directly in the spendable balance.
const dayKey = (userId: string) => `daily:${userId}:idx`;
const streakKey = (userId: string) => `daily:${userId}:streak`;

export async function claimDaily(
  store: Store,
  userId: string,
  opts: ClaimOptions,
): Promise<ClaimResult> {
  const timeZone = opts.timeZone ?? 'UTC';
  const today = dayIndex(opts.now ?? new Date(), timeZone);
  const lastRaw = await store.get(dayKey(userId));
  const last = lastRaw === null ? null : Number(lastRaw);
  const streak = Number((await store.get(streakKey(userId))) ?? 0) || 0;

  if (last === today) return { claimed: false, amount: 0, streak };

  const grace = opts.streakGraceDays ?? 1;
  const next = last !== null && today - last <= grace + 1 ? streak + 1 : 1;
  const bonus = opts.streakBonus ?? 0;
  const amount = opts.amount + bonus * (next - 1);

  await store.set(dayKey(userId), String(today));
  await store.set(streakKey(userId), String(next));
  await store.incrBy(`bal:${userId}`, amount);
  return { claimed: true, amount, streak: next };
}
