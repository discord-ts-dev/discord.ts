import { AuditLogEvent, type Guild } from 'discord.js';
import { parseMentionId } from './discovery/discord-args.js';

export { parseMentionId };

export interface AuditEntry {
  action: string;
  targetId?: string;
  executorId?: string;
  reason?: string;
  createdAt?: Date;
}

/** Thin OOP wrapper over guild.fetchAuditLogs. Empty array on failure or missing access. */
export async function getAuditEntries(guild: Guild, limit = 10): Promise<AuditEntry[]> {
  try {
    const logs = await guild.fetchAuditLogs({ limit: Math.min(Math.max(limit, 1), 100) });
    return [...logs.entries.values()].map((e) => ({
      action: e.action ? (AuditLogEvent[e.action] ?? String(e.action)) : 'unknown',
      targetId: (e.target as { id?: string } | null)?.id,
      executorId: (e.executor as { id?: string } | null)?.id,
      reason: e.reason ?? undefined,
      createdAt: e.createdAt ?? undefined,
    }));
  } catch {
    return [];
  }
}

type BulkDeletable = {
  bulkDelete(m: unknown, filterOld?: boolean): Promise<{ size?: number } | unknown>;
  messages?: {
    fetch(
      o: unknown,
    ): Promise<Map<string, { id: string; author?: { id?: string }; createdTimestamp?: number }>>;
  };
};

/** Delete up to `count` messages, optionally only `targetUserId`. Returns deleted count. */
export async function bulkClear(
  channel: BulkDeletable,
  count: number,
  targetUserId?: string,
): Promise<number> {
  const n = Math.min(Math.max(Math.floor(count), 1), 100);
  if (!targetUserId) {
    const res = (await channel.bulkDelete(n, true)) as { size?: number };
    return typeof res?.size === 'number' ? res.size : n;
  }
  if (!channel.messages) throw new Error('This channel does not support filtered clear.');
  const fetched = await channel.messages.fetch({ limit: 100 });
  const ids = [...fetched.values()]
    .filter((m) => m.author?.id === targetUserId)
    .slice(0, n)
    .map((m) => m.id);
  if (!ids.length) return 0;
  const res = (await channel.bulkDelete(ids, true)) as { size?: number };
  return typeof res?.size === 'number' ? res.size : ids.length;
}

export const TIMEOUT_MIN = 1;
export const TIMEOUT_MAX_MINUTES = 40320; // 28 days, Discord limit

/** Timeout a guild member. Throws a human-readable Error on bad input or hierarchy. */
export async function applyTimeout(
  guild: Guild,
  userId: string,
  minutes: number,
  reason?: string,
): Promise<void> {
  if (!Number.isFinite(minutes) || minutes < TIMEOUT_MIN || minutes > TIMEOUT_MAX_MINUTES)
    throw new Error(`Timeout must be ${TIMEOUT_MIN}-${TIMEOUT_MAX_MINUTES} minutes.`);
  const member = await guild.members.fetch(userId);
  if (!member.manageable) throw new Error('I cannot moderate this member (role order).');
  await member.timeout(minutes * 60_000, reason ?? 'No reason');
}
