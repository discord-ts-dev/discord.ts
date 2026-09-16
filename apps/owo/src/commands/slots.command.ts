import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { getBalance } from '@discord.ts/systems';
import { parseAmount } from '@discord.ts/utils';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { slotMultiplier, spinSlot } from '../game/slots.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { SlotsDto } from './dto/owo.dto.js';

@Injectable()
@GuildToggleable()
export class SlotsCommand {
  @Command({ name: 'slots', description: 'Spin the slot machine' })
  @Cooldown(3)
  async slots(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: SlotsDto,
  ): Promise<void> {
    const userId = ctx.user.id;
    const balance = await getBalance(store, userId);
    const parsed = parseAmount(dto.amount, balance);
    if (!parsed.ok) {
      await ctx.reply({
        content: tt(ctx, `game:bet.${parsed.reason}`, { balance: fmt(balance) }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reels = spinSlot();
    const multiplier = slotMultiplier(reels.map((symbol) => symbol.id));
    const payout = Math.floor(parsed.value * multiplier);
    const next = await credit(store, userId, payout - parsed.value);

    const embed = new EmbedBuilder()
      .setColor(payout > 0 ? COLORS.success : COLORS.error)
      .setTitle(tt(ctx, 'game:slots.title'))
      .setDescription(reels.map((symbol) => symbol.emoji).join(' | '))
      .setFooter({
        text:
          payout > 0
            ? tt(ctx, 'game:slots.win', {
                multiplier,
                amount: fmt(payout),
                balance: fmt(next),
              })
            : tt(ctx, 'game:slots.lose', { balance: fmt(next) }),
      });
    await ctx.reply({ embeds: [embed] });
  }
}
