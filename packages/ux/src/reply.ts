import { MessageFlags, type InteractionReplyOptions } from 'discord.js';

/** Narrow reply payload: text content plus the ephemeral flag only. */
export type EphemeralReplyOptions = Pick<InteractionReplyOptions, 'content'> & {
  content: string;
  flags: MessageFlags.Ephemeral;
};

/** Structural target: anything with an interaction-style reply. */
export interface EphemeralTarget {
  reply(options: EphemeralReplyOptions): Promise<unknown>;
  readonly replied?: boolean;
  readonly deferred?: boolean;
}

function isEphemeralTarget(target: unknown): target is EphemeralTarget {
  return (
    typeof target === 'object' &&
    target !== null &&
    'reply' in target &&
    typeof target.reply === 'function'
  );
}

/**
 * Best-effort ephemeral reply. Accepts `unknown` and narrows at runtime:
 * sends only when the target looks repliable and nothing was replied or
 * deferred yet, and never throws: a failed deny reply must not shadow the
 * original block.
 */
export async function replyEphemeral(target: unknown, content: string): Promise<void> {
  try {
    if (!isEphemeralTarget(target)) return;
    if (target.replied || target.deferred) return;
    await target.reply({ content, flags: MessageFlags.Ephemeral });
  } catch {
    // ignore reply failures, the caller is already blocked
  }
}
