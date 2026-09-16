import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { readBet } from './bet.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { advanceQuest } from '../game/quests.js';
import { flip } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { CoinflipDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class CoinflipCommand {
  @Command({ name: 'coinflip', description: 'Bet pawcoins on a coin flip' })
  @Cooldown(3)
  async coinflip(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: CoinflipDto,
  ): Promise<void> {
    const userId = ctx.user.id;
    const bet = await readBet(ctx, dto.amount);
    if (bet === null) return;

    const choice = dto.choice === 'tails' ? 'tails' : 'heads';
    const result = flip();
    const won = result === choice;
    const next = await credit(store, userId, won ? bet : -bet);
    await advanceQuest(store, userId, 'flip');

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.error)
      .setTitle(tt(ctx, 'game:coinflip.title'))
      .setDescription(
        tt(ctx, won ? 'game:coinflip.win' : 'game:coinflip.lose', {
          result,
          choice,
          amount: fmt(bet),
        }),
      )
      .setFooter({ text: tt(ctx, 'game:coinflip.balance', { balance: fmt(next) }) });
    await ctx.reply({ embeds: [embed] });
  }
}
