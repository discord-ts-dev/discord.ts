import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS, GAME } from '../game/config.js';
import { buyTickets, lotteryState } from '../game/lottery.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { LotteryBuyDto } from './dto/owo.dto.js';

const Lottery = createCommandGroupDecorator({
  name: 'lottery',
  description: 'Ticket lottery: the pot pays one winner every hour',
});

@Injectable()
@GuildToggleable()
@Lottery()
export class LotteryCommand {
  @Subcommand({ name: 'buy', description: 'Buy tickets into the pot' })
  async buy(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: LotteryBuyDto,
  ): Promise<void> {
    const result = await buyTickets(store, ctx.user.id, dto.count);
    if (!result.ok) {
      await ctx.reply({
        content:
          result.reason === 'insufficient-funds'
            ? tt(ctx, 'game:lottery.buy-fail-balance', {
                price: fmt(GAME.lotteryTicketPrice),
                balance: fmt(result.balance),
              })
            : tt(ctx, 'game:lottery.buy-fail-count'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await ctx.reply(
      tt(ctx, 'game:lottery.buy-ok', {
        count: dto.count,
        pot: fmt(result.pot),
        balance: fmt(result.balance),
      }),
    );
  }

  @Subcommand({ name: 'info', description: 'Show the pot, your tickets, and the last winner' })
  async info(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const state = await lotteryState(store);
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:lottery.info-title'))
      .setDescription(
        tt(ctx, 'game:lottery.info', {
          pot: fmt(state.pot),
          tickets: state.tickets[ctx.user.id] ?? 0,
        }),
      )
      .setFooter({
        text: state.last
          ? tt(ctx, 'game:lottery.last', {
              winner: state.last.winner,
              pot: fmt(state.last.pot),
            })
          : tt(ctx, 'game:lottery.no-last'),
      });
    await ctx.reply({ embeds: [embed] });
  }
}
