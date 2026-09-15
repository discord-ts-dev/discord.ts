import type { User } from 'discord.js';

// ponytail: pure string checks, no client needed. Lenient on length;
// use isSnowflake when a real Discord id shape is required.

/** Extract an id from a user, role, or channel mention, or a raw id. */
export function parseMentionId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^<@!?(\d+)>$/) ?? raw.match(/^<@&(\d+)>$/) ?? raw.match(/^<#(\d+)>$/);
  if (m) return m[1];
  return /^\d+$/.test(raw) ? raw : undefined;
}

/** Resolve a `User` object or a mention / id string to an id. */
export function userIdOf(raw: User | string | undefined): string | undefined {
  if (!raw) return undefined;
  if (typeof raw !== 'string') return raw.id;
  return parseMentionId(raw);
}

/** Strict Discord snowflake shape: 17-20 digits. */
export function isSnowflake(id: string | undefined): boolean {
  return !!id && /^\d{17,20}$/.test(id);
}

// ponytail: floor-math durations plus a block progress bar. Pure display,
// no client needed.

/** Format milliseconds as `Xs`, `Xm Ys`, `Xh Ym`, or `Xd Xh`. */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h ${totalMinutes % 60}m`;
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

/** `▓`/`░` bar with percent, e.g. progress displays. */
export function progressBar(current: number, total: number, size = 20): string {
  if (!total || total <= 0) return `${'░'.repeat(size)} 0%`;
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * size);
  return `${'▓'.repeat(filled)}${'░'.repeat(size - filled)} ${Math.round(ratio * 100)}%`;
}

export { parseAmount } from './amount.js';
export type { AmountResult } from './amount.js';
export { containsBlocked, maskBlocked } from './words.js';
export { parseVotePayload } from './vote.js';
