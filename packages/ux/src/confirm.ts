import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type EmbedBuilder,
  type RepliableInteraction,
} from 'discord.js';
import { deliver, replyEphemeral } from './reply.js';
import { normalizeCollectorOptions, type CollectorOptions } from './collector-options.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

type ConfirmTarget = RepliableInteraction;

export interface ConfirmOptions extends CollectorOptions {}

/** Yes/No dialog. Accepts text or an embed payload. True on confirm. */
export async function confirm(
  target: ConfirmTarget,
  question: string | { content?: string; embeds?: EmbedBuilder[] },
  timeoutOrOptions: number | ConfirmOptions = 15_000,
): Promise<boolean> {
  const { timeoutMs, allowedUserId } = normalizeCollectorOptions(timeoutOrOptions, 15_000);
  const tag = uid();
  const yes = `discord-ts:confirm:yes:${tag}`;
  const no = `discord-ts:confirm:no:${tag}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(yes).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(no).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  const body = typeof question === 'string' ? { content: question } : question;
  const msg = await deliver(target, { ...body, components: [row] });
  if (!msg) return false;
  return new Promise((resolve) => {
    const collector = (
      msg as unknown as {
        createMessageComponentCollector(o: unknown): {
          on(
            e: string,
            fn: (i: {
              customId: string;
              user: { id: string };
              update(m: unknown): Promise<unknown>;
            }) => void,
          ): void;
          stop(): void;
        };
      }
    ).createMessageComponentCollector({ componentType: ComponentType.Button, time: timeoutMs });
    let done = false;
    collector.on('collect', (i) => {
      if (i.customId !== yes && i.customId !== no) return;
      if (allowedUserId && i.user.id !== allowedUserId) {
        void replyEphemeral(i, 'Not yours to confirm.');
        return;
      }
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
