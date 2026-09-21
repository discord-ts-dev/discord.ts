import { Command, Context, Injectable } from '@discord.ts/common';
import { getBalance, rankOf } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { WEALTH_BOARD, XP_BOARD, ZOO_BOARD } from '../game/economy.js';
import { levelFromXp } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class MeCommand {
  @Command({
    name: 'me',
    description: 'Your ranks across the boards',
    category: 'Economy',
    toggleable: true,
  })
  async me(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const userId = ctx.user.id;
    const [xp, wealth, zoo, balance] = await Promise.all([
      rankOf(store, XP_BOARD, userId),
      rankOf(store, WEALTH_BOARD, userId),
      rankOf(store, ZOO_BOARD, userId),
      getBalance(store, userId),
    ]);

    const rankText = (row: { rank: number; score: number } | null) =>
      row ? `#${row.rank}` : tt(ctx, 'game:me.unranked');

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:me.title', { user: `<@${userId}>` }))
      .addFields(
        {
          name: tt(ctx, 'game:profile.level'),
          value: `${levelFromXp(xp?.score ?? 0)}`,
          inline: true,
        },
        {
          name: tt(ctx, 'game:me.xp'),
          value: `${rankText(xp)} (${fmt(xp?.score ?? 0)} XP)`,
          inline: true,
        },
        {
          name: tt(ctx, 'game:me.wealth'),
          value: `${rankText(wealth)} (${fmt(balance)})`,
          inline: true,
        },
        { name: tt(ctx, 'game:me.zoo'), value: rankText(zoo), inline: true },
      );
    await ctx.reply({ embeds: [embed] });
  }
}
