import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { readBet } from './bet.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { slotMultiplier, spinSlot } from '../game/slots.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { BetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class SlotsCommand {
  @Command({ name: 'slots', description: 'Spin the slot machine' })
  @Cooldown(3)
  async slots(@Context() ctx: ChatInputCommandInteraction, @Options() dto: BetDto): Promise<void> {
    const userId = ctx.user.id;
    const bet = await readBet(ctx, dto.amount);
    if (bet === null) return;

    const reels = spinSlot();
    const multiplier = slotMultiplier(reels.map((symbol) => symbol.id));
    const payout = Math.floor(bet * multiplier);
    const next = await credit(store, userId, payout - bet);

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
