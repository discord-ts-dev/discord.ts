import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type ConfirmTarget = RepliableInteraction;

/** Yes/No dialog. Accepts text or an embed payload. True on confirm. */
export async function confirm(
  target: ConfirmTarget,
  question: string | { content?: string; embeds?: EmbedBuilder[] },
  timeoutMs = 15_000,
): Promise<boolean> {
  const tag = uid();
  const yes = `discord-ts:confirm:yes:${tag}`;
  const no = `discord-ts:confirm:no:${tag}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(yes).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(no).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  const body = typeof question === 'string' ? { content: question } : question;
  const payload = { ...body, components: [row] };
  const ix = target as {
    replied?: boolean;
    deferred?: boolean;
    editReply(m: unknown): Promise<{ createMessageComponentCollector(o: unknown): unknown }>;
    reply(m: unknown): Promise<unknown>;
  };
  const msg =
    ix.replied || ix.deferred
      ? await ix.editReply(payload)
      : await ix.reply({ ...payload, fetchReply: true });
  return new Promise((resolve) => {
    const collector = (
      msg as unknown as {
        createMessageComponentCollector(o: unknown): {
          on(
            e: string,
            fn: (i: { customId: string; update(m: unknown): Promise<unknown> }) => void,
          ): void;
          stop(): void;
        };
      }
    ).createMessageComponentCollector({ componentType: ComponentType.Button, time: timeoutMs });
    let done = false;
    collector.on('collect', (i) => {
      if (i.customId !== yes && i.customId !== no) return;
      done = true;
      collector.stop();
      void i.update({ content: i.customId === yes ? 'Confirmed.' : 'Cancelled.', components: [] });
      resolve(i.customId === yes);
    });
    collector.on('end', () => {
      if (!done) resolve(false);
    });
  });
}
