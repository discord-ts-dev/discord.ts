import type { Message, User } from 'discord.js';

// ponytail: pure string checks, no client needed. Lenient on length;
// use isSnowflake when a real Discord id shape is required.

/** Extract an id from a user, role, or channel mention, or a raw id. */
export function parseMentionId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^<@!?(\d+)>$/) ?? raw.match(/^<@&(\d+)>$/) ?? raw.match(/^<#(\d+)>$/);
  if (m) return m[1];
  return /^\d+$/.test(raw) ? raw : undefined;
}

/** Resolve a slash User or a prefix mention/id string to an id. */
export function userIdOf(raw: User | string | undefined): string | undefined {
  if (!raw) return undefined;
  if (typeof raw !== 'string') return raw.id;
  return parseMentionId(raw);
}

/** Strict Discord snowflake shape: 17-20 digits. */
export function isSnowflake(id: string | undefined): boolean {
  return !!id && /^\d{17,20}$/.test(id);
}

/** True for a prefix Message as opposed to a slash interaction. */
export function isMessage(target: unknown): target is Message {
  return (
    !!target &&
    typeof target === 'object' &&
    'content' in (target as object) &&
    'author' in (target as object)
  );
}
