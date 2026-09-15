import {
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  type RepliableInteraction,
} from 'discord.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type PickTarget =
  | (RepliableInteraction & {
      editReply(msg: unknown): Promise<unknown>;
      reply(msg: unknown): Promise<unknown>;
      replied?: boolean;
      deferred?: boolean;
    })
  // ponytail: structural slot for CommandContext, no dep on common
  | {
      reply(msg: unknown): Promise<unknown>;
      editReply(msg: unknown): Promise<unknown>;
      replied?: boolean;
      deferred?: boolean;
    }
  | {
      reply(msg: unknown): Promise<unknown>;
    };

const isMessage = (t: PickTarget): boolean =>
  'content' in (t as object) && 'author' in (t as object);

export interface PickOption {
  label: string;
  value: string;
  description?: string;
}

export interface PickConfig {
  placeholder?: string;
  content?: string;
  timeoutMs?: number;
  /** Restrict picks to one user id; others get an ephemeral nudge. */
  allowedUserId?: string;
}

/** Single-select menu. Resolves the picked value, or null on timeout. */
export async function pickOne(
  target: PickTarget,
  options: PickOption[],
  config: PickConfig = {},
): Promise<string | null> {
  const timeoutMs = config.timeoutMs ?? 60_000;
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`discord-ts:pick:${uid()}`)
    .setPlaceholder(config.placeholder ?? 'Choose one')
    .addOptions(options.slice(0, 25).map((o) => ({ ...o })));
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  const base = { components: [row] };
  const payload = config.content !== undefined ? { content: config.content, ...base } : { ...base };
  const ix = target as {
    replied?: boolean;
    deferred?: boolean;
    editReply(m: unknown): Promise<unknown>;
    reply(m: unknown): Promise<unknown>;
  };
  const msg = isMessage(target)
    ? await ix.reply(payload)
    : ix.replied || ix.deferred
      ? await ix.editReply(payload)
      : await ix.reply({ ...payload, fetchReply: true });
  return new Promise((resolve) => {
    const collector = (
      msg as unknown as {
        createMessageComponentCollector(o: unknown): {
          on(
            e: string,
            fn: (c: {
              values: string[];
              user: { id: string };
              update(m: unknown): Promise<unknown>;
              reply(m: unknown): Promise<unknown>;
            }) => void,
          ): void;
          stop(): void;
        };
      }
    ).createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: timeoutMs,
    });
    let done = false;
    collector.on('collect', (c) => {
      if (config.allowedUserId && c.user.id !== config.allowedUserId) {
        void c.reply({ content: 'Not yours to pick.', ephemeral: true });
        return;
      }
      done = true;
      collector.stop();
      const value = c.values[0] ?? null;
      void c.update({ components: [] }).catch(() => undefined);
      resolve(value);
    });
    collector.on('end', () => {
      if (!done) resolve(null);
    });
  });
}
