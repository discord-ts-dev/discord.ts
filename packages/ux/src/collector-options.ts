/** Shared collector options: lifetime plus an optional single-user lock. */
export interface CollectorOptions {
  timeoutMs?: number;
  /** Restrict interaction to one user id; others get an ephemeral nudge. */
  allowedUserId?: string;
}

/** Accept the legacy positional number or the options object. */
export function normalizeCollectorOptions(
  input: number | CollectorOptions,
  fallbackMs: number,
): Required<Pick<CollectorOptions, 'timeoutMs'>> & Pick<CollectorOptions, 'allowedUserId'> {
  const opts: CollectorOptions = typeof input === 'number' ? { timeoutMs: input } : input;
  return { timeoutMs: opts.timeoutMs ?? fallbackMs, allowedUserId: opts.allowedUserId };
}
