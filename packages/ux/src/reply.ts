import { MessageFlags } from 'discord.js';

/** Structural target: anything with an interaction-style reply. Guards pass raw interactions. */
export interface EphemeralTarget {
  reply?(options: { content: string; flags: number }): Promise<unknown>;
  replied?: boolean;
  deferred?: boolean;
}

/**
 * Best-effort ephemeral reply. Sends only when nothing was replied or
 * deferred yet, and never throws: a failed deny reply must not shadow the
 * original block.
 */
export async function replyEphemeral(target: EphemeralTarget, content: string): Promise<void> {
  try {
    if (typeof target.reply !== 'function' || target.replied || target.deferred) return;
    await target.reply({ content, flags: MessageFlags.Ephemeral });
  } catch {
    // ignore reply failures, the caller is already blocked
  }
}
