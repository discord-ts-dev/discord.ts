import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type RepliableInteraction,
} from 'discord.js';

const uid = (): string => Math.random().toString(36).slice(2, 10);

/** Yes/No dialog. Returns true on confirm, false on cancel or timeout. */
export async function confirm(
  interaction: RepliableInteraction & {
    editReply(msg: unknown): Promise<{ createMessageComponentCollector(o: unknown): unknown }>;
    reply(msg: unknown): Promise<unknown>;
    replied?: boolean;
    deferred?: boolean;
  },
  question: string,
  timeoutMs = 15_000,
): Promise<boolean> {
  const tag = uid();
  const yes = `discord-ts:confirm:yes:${tag}`;
  const no = `discord-ts:confirm:no:${tag}`;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(yes).setLabel('Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(no).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  const payload = { content: question, components: [row] };
  const msg =
    interaction.replied || interaction.deferred
      ? await interaction.editReply(payload)
      : ((await interaction.reply({ ...payload, fetchReply: true })) as {
          createMessageComponentCollector(o: unknown): {
            on(e: string, fn: (i: unknown) => void): void;
            stop(): void;
          };
        });
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
    collector.on('collect', (i) => {
      if (i.customId !== yes && i.customId !== no) return;
      collector.stop();
      void i.update({ content: i.customId === yes ? 'Confirmed.' : 'Cancelled.', components: [] });
      resolve(i.customId === yes);
    });
    collector.on('end', () => resolve(false));
  });
}
