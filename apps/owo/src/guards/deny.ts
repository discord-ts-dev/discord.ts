/** Shared reply for a guard that denies an interaction. */
export async function denyInteraction(ix: Record<string, unknown>, content: string): Promise<void> {
  try {
    const reply = ix['reply'] as ((msg: unknown) => Promise<unknown>) | undefined;
    if (typeof reply === 'function' && !ix['replied'] && !ix['deferred'])
      await reply.call(ix, { content, ephemeral: true });
  } catch {
    // ignore reply failures, handler already blocked
  }
}
