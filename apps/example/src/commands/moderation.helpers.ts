import { parseMentionId } from '@discord.ts/core';
import { errorEmbed } from '@discord.ts/ux';
import {
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
  return parseMentionId(raw);
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
