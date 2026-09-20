import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';
import { deliver, replyEphemeral } from './reply.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type PageTarget = RepliableInteraction;

export interface PaginateOptions {
  timeoutMs?: number;
  /** Restrict paging to one user id; others get an ephemeral nudge. */
  allowedUserId?: string;
}

/** Prev/Next embed pager. Resolves when it times out. */
export async function paginate(
  target: PageTarget,
  pages: EmbedBuilder[],
  timeoutOrOptions: number | PaginateOptions = 60_000,
): Promise<void> {
  const opts: PaginateOptions =
    typeof timeoutOrOptions === 'number' ? { timeoutMs: timeoutOrOptions } : timeoutOrOptions;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const allowedUserId = opts.allowedUserId;
  if (!pages.length) return;
  if (pages.length === 1) {
    await deliver(target, { embeds: [pages[0]] });
    return;
  }
  const tag = uid();
  const prev = `discord-ts:page:prev:${tag}`;
  const next = `discord-ts:page:next:${tag}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(prev).setLabel('◀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(next).setLabel('▶').setStyle(ButtonStyle.Secondary),
  );
  let i = 0;
  const payload = () => ({ embeds: [pages[i]], components: [row] });
  const msg = await deliver(target, payload());
  if (!msg) return;
  const collector = (
    msg as unknown as {
      createMessageComponentCollector(o: unknown): {
        on(
          e: string,
          fn: (c: {
            customId: string;
            user: { id: string };
            update(m: unknown): Promise<unknown>;
          }) => void,
        ): void;
      };
    }
  ).createMessageComponentCollector({ componentType: ComponentType.Button, time: timeoutMs });
  collector.on('collect', (c) => {
    if (c.customId !== prev && c.customId !== next) return;
    if (allowedUserId && c.user.id !== allowedUserId) {
      void replyEphemeral(c, 'Not yours to page.');
      return;
    }
    if (c.customId === prev) i = (i - 1 + pages.length) % pages.length;
    else i = (i + 1) % pages.length;
    void c.update(payload());
  });
}
