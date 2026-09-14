import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type PageTarget =
  | (RepliableInteraction & {
      editReply(msg: unknown): Promise<unknown>;
      reply(msg: unknown): Promise<unknown>;
      replied?: boolean;
      deferred?: boolean;
    })
  | {
      reply(msg: unknown): Promise<unknown>;
    };

const isMessage = (t: PageTarget): boolean =>
  'content' in (t as object) && 'author' in (t as object);

/** Prev/Next embed pager. Works on interactions and prefix messages. Resolves when it times out. */
export async function paginate(
  target: PageTarget,
  pages: EmbedBuilder[],
  timeoutMs = 60_000,
): Promise<void> {
  if (!pages.length) return;
  const ix = target as {
    replied?: boolean;
    deferred?: boolean;
    editReply(m: unknown): Promise<unknown>;
    reply(m: unknown): Promise<unknown>;
  };
  if (pages.length === 1) {
    const payload = { embeds: [pages[0]] };
    if (!isMessage(target) && (ix.replied || ix.deferred)) await ix.editReply(payload);
    else await ix.reply(payload);
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
  const msg =
    !isMessage(target) && (ix.replied || ix.deferred)
      ? await ix.editReply(payload())
      : await ix.reply(isMessage(target) ? payload() : { ...payload(), fetchReply: true });
  const collector = (
    msg as unknown as {
      createMessageComponentCollector(o: unknown): {
        on(
          e: string,
          fn: (c: { customId: string; update(m: unknown): Promise<unknown> }) => void,
        ): void;
      };
    }
  ).createMessageComponentCollector({ componentType: ComponentType.Button, time: timeoutMs });
  collector.on('collect', (c) => {
    if (c.customId === prev) i = (i - 1 + pages.length) % pages.length;
    else if (c.customId === next) i = (i + 1) % pages.length;
    else return;
    void c.update(payload());
  });
}
