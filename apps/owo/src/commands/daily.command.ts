import { Command, Context, Injectable } from '@discord.ts/common';
import { addScore, claimDaily } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS, GAME } from '../game/config.js';
import { WEALTH_BOARD, XP_BOARD } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class DailyCommand {
  @Command({ name: 'daily', description: 'Claim your daily pawcoins' })
  async daily(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const result = await claimDaily(store, ctx.user.id, {
      amount: GAME.dailyAmount,
      streakBonus: GAME.dailyStreakBonus,
      timeZone: GAME.dailyTimeZone,
    });

    const embed = new EmbedBuilder().setColor(COLORS.gold).setTitle(tt(ctx, 'game:daily.title'));
    if (!result.claimed) {
      embed.setDescription(tt(ctx, 'game:daily.already', { streak: result.streak }));
      await ctx.reply({ embeds: [embed] });
      return;
    }

    await addScore(store, XP_BOARD, ctx.user.id, GAME.dailyXp);
    await addScore(store, WEALTH_BOARD, ctx.user.id, result.amount);
    embed.setDescription(
      tt(ctx, 'game:daily.claimed', {
        amount: fmt(result.amount),
        streak: result.streak,
        xp: GAME.dailyXp,
      }),
    );
    await ctx.reply({ embeds: [embed] });
  }
}
