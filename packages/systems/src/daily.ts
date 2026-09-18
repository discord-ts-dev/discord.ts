import { dayIndex } from './scheduler.js';
import { keys } from './keys.js';
import type { Store } from './store.js';

export interface ClaimOptions {
  amount: number;
  streakBonus?: number;
  streakGraceDays?: number;
  timeZone?: string;
  now?: Date;
  /** Keep a sorted-set board equal to the new balance, in the same atomic write. */
  mirrorBoard?: string;
}

export interface ClaimResult {
  claimed: boolean;
  amount: number;
  streak: number;
}

export async function claimDaily(
  store: Store,
  userId: string,
  opts: ClaimOptions,
): Promise<ClaimResult> {
  const timeZone = opts.timeZone ?? 'UTC';
  const today = dayIndex(opts.now ?? new Date(), timeZone);
  const dayKey = keys.dailyIndex(userId);
  const streakKey = keys.dailyStreak(userId);
  const balanceKey = keys.balance(userId);
  return store.update<ClaimResult>([dayKey, streakKey, balanceKey], (current) => {
    const last = current[dayKey] === null ? null : Number(current[dayKey]);
    const streak = Number(current[streakKey] ?? 0) || 0;
    if (last === today) return { result: { claimed: false, amount: 0, streak } };

    const grace = opts.streakGraceDays ?? 1;
    const next = last !== null && today - last <= grace + 1 ? streak + 1 : 1;
    const bonus = opts.streakBonus ?? 0;
    const amount = opts.amount + bonus * (next - 1);
    const balance = (Number(current[balanceKey] ?? 0) || 0) + amount;
    return {
      result: { claimed: true, amount, streak: next },
      writes: {
        [dayKey]: String(today),
        [streakKey]: String(next),
        [balanceKey]: String(balance),
      },
      zadds: opts.mirrorBoard
        ? [{ key: keys.leaderboard(opts.mirrorBoard), score: balance, member: userId }]
        : undefined,
    };
  });
}
