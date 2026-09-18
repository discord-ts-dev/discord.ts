interface ButtonLike {
  data: { custom_id: string };
}

interface RowLike {
  components?: ButtonLike[];
}

export interface Captured {
  replies: unknown[];
  edits: unknown[];
  updates: unknown[];
  nudges: unknown[];
}

export interface FakeOptions {
  replied?: boolean;
  deferred?: boolean;
  /** Given the customIds in the sent buttons, the ids to collect, in order. Defaults to none. */
  plan?: (ids: string[]) => string[];
  /** Fire the collector 'end' event after collects. */
  end?: boolean;
  /** Id of the user the collector reports as the actor. */
  user?: string;
}

const noCollect = (): string[] => [];

export function customIdsOf(payload: unknown): string[] {
  const row = (payload as { components?: RowLike[] } | undefined)?.components?.[0];
  return (row?.components ?? []).map((c) => c.data.custom_id);
}

/** Fake interaction target with a synchronous component collector. */
export function fakeTarget(opts: FakeOptions = {}) {
  const captured: Captured = { replies: [], edits: [], updates: [], nudges: [] };
  const msg = {
    createMessageComponentCollector: (_o: unknown) => ({
      on: (event: string, fn: (arg: unknown) => void): void => {
        if (event === 'end') {
          if (opts.end) fn(undefined);
          return;
        }
        if (event !== 'collect') return;
        const ids = customIdsOf(captured.replies.at(-1) ?? captured.edits.at(-1));
        for (const id of (opts.plan ?? noCollect)(ids)) {
          fn({
            customId: id,
            values: [id],
            user: { id: opts.user ?? 'u1' },
            update: async (m: unknown) => void captured.updates.push(m),
            reply: async (m: unknown) => void captured.nudges.push(m),
          });
        }
      },
      stop: (): void => undefined,
    }),
  };
  const target: Record<string, unknown> = {
    // Mirrors discord.js `withResponse: true`: the message rides in resource.
    reply: async (m: unknown) => {
      captured.replies.push(m);
      return { resource: { message: msg } };
    },
    editReply: async (m: unknown) => {
      captured.edits.push(m);
      return msg;
    },
    replied: opts.replied ?? false,
    deferred: opts.deferred ?? false,
  };
  return { target, captured, msg };
}
