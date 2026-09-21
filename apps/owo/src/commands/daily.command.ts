import { Command, Context, Injectable } from '@discord.ts/common';
import { addScore, claimDaily } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS, GAME } from '../game/config.js';
import { WEALTH_BOARD, XP_BOARD } from '../game/economy.js';
import { dailyMultiplier, premiumTierOf } from '../game/premium.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class DailyCommand {
  @Command({
    name: 'daily',
    description: 'Claim your daily pawcoins',
    category: 'Gameplay',
    toggleable: true,
  })
  async daily(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const tier = await premiumTierOf(store, ctx.user.id);
    const result = await claimDaily(store, ctx.user.id, {
      amount: GAME.dailyAmount * dailyMultiplier(tier),
      streakBonus: GAME.dailyStreakBonus,
      timeZone: GAME.dailyTimeZone,
      mirrorBoard: WEALTH_BOARD,
    });

    const embed = new EmbedBuilder().setColor(COLORS.gold).setTitle(tt(ctx, 'game:daily.title'));
    if (!result.claimed) {
      embed.setDescription(tt(ctx, 'game:daily.already', { streak: result.streak }));
      await ctx.reply({ embeds: [embed] });
      return;
    }

    await addScore(store, XP_BOARD, ctx.user.id, GAME.dailyXp);
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
