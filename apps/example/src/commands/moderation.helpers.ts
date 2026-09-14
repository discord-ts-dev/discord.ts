import { errorEmbed } from '@discord.ts/ux';
import {
  AuditLogEvent,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  type Message,
  type User,
} from 'discord.js';

export type Ctx = ChatInputCommandInteraction | Message;

// ponytail: bounded in-memory stores, FIFO evict. No DB until needed.
const MAX_AUDIT = 100;
const MAX_WARNS_PER_USER = 25;

export interface WarnRecord {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  at: number;
}

export interface AuditEntry extends WarnRecord {
  action: string;
}

export const warnings = new Map<string, WarnRecord[]>();
export const audit: AuditEntry[] = [];

export function warnKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function pushAudit(e: AuditEntry): void {
  audit.push(e);
  if (audit.length > MAX_AUDIT) audit.shift();
}

export function pushWarn(w: WarnRecord): void {
  const k = warnKey(w.guildId, w.userId);
  const list = warnings.get(k) ?? [];
  list.push(w);
  while (list.length > MAX_WARNS_PER_USER) list.shift();
  warnings.set(k, list);
  pushAudit({ ...w, action: 'warn' });
}

export function isMsg(ctx: Ctx): ctx is Message {
  return 'content' in ctx && 'author' in ctx;
}

export function modId(ctx: Ctx): string {
  return isMsg(ctx) ? ctx.author.id : ctx.user.id;
}

export function guildOf(ctx: Ctx): Guild | null {
  return (ctx.guild as Guild | null) ?? null;
}

// Slash gives User, prefix gives coerced id string. Resolve both.
export function userIdOf(raw: User | string | undefined): string | undefined {
  if (!raw) return undefined;
  if (typeof raw !== 'string') return raw.id;
  const m = raw.match(/^<@!?(\d+)>$/) ?? raw.match(/^<@&(\d+)>$/) ?? raw.match(/^<#(\d+)>$/);
  if (m) return m[1];
  return /^\d+$/.test(raw) ? raw : undefined;
}

export interface NativeAuditEntry {
  action: string;
  targetId?: string;
  executorId?: string;
  reason?: string;
  createdAt?: Date;
}

/** Thin wrapper over guild.fetchAuditLogs. Empty array on failure or missing access. */
export async function getAuditEntries(guild: Guild, limit = 10): Promise<NativeAuditEntry[]> {
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

export function modEmbed(action: string, color: number): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Moderation: ${action}`)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: 'discord.ts moderation example' });
}

export async function replyEmbed(ctx: Ctx, embed: EmbedBuilder, ephemeral = false): Promise<void> {
  if (isMsg(ctx)) {
    await ctx.reply({ embeds: [embed] });
    return;
  }
  if (ctx.replied || ctx.deferred) await ctx.followUp({ embeds: [embed], ephemeral });
  else await ctx.reply({ embeds: [embed], ephemeral });
}

export async function replyError(ctx: Ctx, text: string): Promise<void> {
  await replyEmbed(ctx, errorEmbed(text), true);
}

export function auditAndLog(ctx: Ctx, action: string, userId: string, reason: string): void {
  const guild = guildOf(ctx);
  if (!guild) return;
  pushAudit({ action, guildId: guild.id, userId, moderatorId: modId(ctx), reason, at: Date.now() });
}
