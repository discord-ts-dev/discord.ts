import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';
import { deliver } from './reply.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type PageTarget = RepliableInteraction;

/** Prev/Next embed pager. Resolves when it times out. */
export async function paginate(
  target: PageTarget,
  pages: EmbedBuilder[],
  timeoutMs = 60_000,
): Promise<void> {
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
