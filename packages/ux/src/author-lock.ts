import { replyEphemeral } from './reply.js';

/** Resolve the initiating user id for an interaction. Null/undefined means unknown. */
export type AuthorResolver = (
  ix: unknown,
) => string | null | undefined | Promise<string | null | undefined>;

/** Build the deny text for a non-author. Receives the unwrapped interaction. */
export type AuthorDeny = (ix: unknown) => string | Promise<string>;

export interface AuthorLockOptions {
  deny?: AuthorDeny;
}

/** Structural guard: `{ canActivate(ctx) }`. No core dependency. */
export interface AuthorGuard {
  canActivate(ctx: unknown): Promise<boolean>;
}

function unwrap(ctx: unknown): unknown {
  if (typeof ctx !== 'object' || ctx === null) return ctx;
  const c = ctx as Record<string, unknown>;
  if (typeof c['getInteraction'] === 'function') return (c['getInteraction'] as () => unknown)();
  if (typeof c['getArgByIndex'] === 'function')
    return (c['getArgByIndex'] as (i: number) => unknown)(0);
  if (typeof c['getContext'] === 'function') return (c['getContext'] as () => unknown)();
  return ctx;
}

function userIdOf(ix: unknown): string | undefined {
  if (typeof ix !== 'object' || ix === null) return undefined;
  const rec = ix as Record<string, unknown>;
  const user = rec['user'] as { id?: unknown } | undefined;
  if (typeof user?.id === 'string') return user.id;
  const author = rec['author'] as { id?: unknown } | undefined;
  if (typeof author?.id === 'string') return author.id;
  return undefined;
}

/**
 * Author lock for component handlers. Restricts a flow to one initiating user;
 * non-authors get an ephemeral nudge and the handler is skipped. Unknown
 * initiator (resolver returns null/undefined) passes through fail-open,
 * deferring to the handler. Usable via `@UseGuards(authorLock(...))` once the
 * core accepts configured guard instances (#46).
 */
export function authorLock(
  resolveUserId: AuthorResolver,
  opts: AuthorLockOptions = {},
): AuthorGuard {
  return {
    async canActivate(ctx: unknown): Promise<boolean> {
      const ix = unwrap(ctx);
      const expected = await resolveUserId(ix);
      if (expected === null || expected === undefined) return true;
      const actual = userIdOf(ix);
      if (!actual) return true;
      if (actual === expected) return true;
      const text = opts.deny ? await opts.deny(ix) : 'Not yours to use.';
      await replyEphemeral(ix, text);
      return false;
    },
  };
}
