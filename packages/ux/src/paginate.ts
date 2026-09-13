import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

/** Prev/Next embed pager. No-op for a single page. Resolves when it times out. */
export async function paginate(
  interaction: RepliableInteraction & {
    editReply(msg: unknown): Promise<unknown>;
    reply(msg: unknown): Promise<unknown>;
    replied?: boolean;
    deferred?: boolean;
  },
  pages: EmbedBuilder[],
  timeoutMs = 60_000,
): Promise<void> {
  if (!pages.length) return;
  if (pages.length === 1) {
    const payload = { embeds: [pages[0]] };
    if (interaction.replied || interaction.deferred) await interaction.editReply(payload);
    else await interaction.reply(payload);
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
    interaction.replied || interaction.deferred
      ? await interaction.editReply(payload())
      : ((await interaction.reply({ ...payload(), fetchReply: true })) as unknown);
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
