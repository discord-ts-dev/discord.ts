import { MessageFlags, type EmbedBuilder, type Message } from 'discord.js';

/** Payload forwarded to the target's reply, edit, or follow-up. */
export interface ReplyPayload {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  [key: string]: unknown;
}

export interface ReplyOptions {
  /** Ask for the payload to be ephemeral. */
  ephemeral?: boolean;
}

/**
 * Structural target: any interaction-style replier. Real discord.js
 * interactions satisfy it. Core guards hold the interaction as a structural
 * record; `deliver` narrows at runtime so they pass it without a cast.
 */
export interface ReplyTarget {
  readonly replied?: boolean;
  readonly deferred?: boolean;
  reply?(payload: unknown): Promise<unknown>;
  editReply?(payload: unknown): Promise<unknown>;
  followUp?(payload: unknown): Promise<unknown>;
}

function narrow(target: unknown): ReplyTarget | null {
  if (typeof target !== 'object' || target === null) return null;
  const candidate = target as Record<string, unknown>;
  if (
    typeof candidate['reply'] !== 'function' &&
    typeof candidate['editReply'] !== 'function' &&
    typeof candidate['followUp'] !== 'function'
  )
    return null;
  return target as ReplyTarget;
}

function messageOf(result: unknown): Message | null {
  if (result === null || result === undefined) return null;
  const resource = (result as { resource?: { message?: Message | null } | null }).resource;
  if (resource !== undefined) return resource?.message ?? null;
  return result as Message;
}

/**
 * One delivery path for a Context. Replies when the Context is free, edits
 * when it is already acknowledged, and follows up when the payload must stay
 * ephemeral after acknowledgement. Never throws; returns the sent or edited
 * message when the target produces one.
 */
export async function deliver(
  target: unknown,
  payload: ReplyPayload,
  opts: ReplyOptions = {},
): Promise<Message | null> {
  const t = narrow(target);
  if (!t) return null;
  const body: ReplyPayload =
    opts.ephemeral === true ? { ...payload, flags: MessageFlags.Ephemeral } : payload;
  try {
    if (t.replied || t.deferred) {
      if (opts.ephemeral === true) {
        if (!t.followUp) return null;
        return messageOf(await t.followUp(body));
      }
      if (!t.editReply) return null;
      return messageOf(await t.editReply(body));
    }
    if (!t.reply) return null;
    return messageOf(await t.reply({ ...body, withResponse: true }));
  } catch {
    return null;
  }
}

/** Best-effort ephemeral text. Guards and app refusals use it. */
export async function replyEphemeral(target: unknown, content: string): Promise<void> {
  await deliver(target, { content }, { ephemeral: true });
}

/** Embed reply with the same acknowledgement rules as `deliver`. */
export async function replyEmbed(
  target: unknown,
  embed: EmbedBuilder,
  ephemeral = false,
): Promise<void> {
  await deliver(target, { embeds: [embed] }, { ephemeral });
}
