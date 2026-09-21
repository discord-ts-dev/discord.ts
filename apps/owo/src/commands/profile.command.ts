import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { getBalance, rankOf } from '@discord.ts/systems';
import { progressBar, userIdOf } from '@discord.ts/utils';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS, TITLES } from '../game/config.js';
import { XP_BOARD } from '../game/economy.js';
import { xpToNext } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { getZoo, zooTotals } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { UserTargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class ProfileCommand {
  @Command({
    name: 'profile',
    description: 'Show pawcoins, level, and zoo summary',
    category: 'Gameplay',
    toggleable: true,
  })
  async profile(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user) ?? ctx.user.id;
    const [balance, rank, zoo, titleId] = await Promise.all([
      getBalance(store, target),
      rankOf(store, XP_BOARD, target),
      getZoo(store, target),
      store.get(`title:${target}`),
    ]);

    const xp = rank?.score ?? 0;
    const { level, into, need } = xpToNext(xp);
    const totals = zooTotals(zoo);
    const title = titleId ? (TITLES[titleId] ?? titleId) : tt(ctx, 'game:profile.none');

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:profile.title', { user: `<@${target}>` }))
      .addFields(
        {
          name: tt(ctx, 'game:profile.balance'),
          value: tt(ctx, 'game:balance.line', { amount: fmt(balance) }),
          inline: true,
        },
        {
          name: tt(ctx, 'game:profile.level'),
          value: `${level} ${progressBar(into, need)}`,
          inline: true,
        },
        {
          name: tt(ctx, 'game:profile.zoo'),
          value: tt(ctx, 'game:profile.zooValue', totals),
          inline: true,
        },
        {
          name: tt(ctx, 'game:profile.rank'),
          value: rank ? `#${rank.rank} (${fmt(xp)} XP)` : tt(ctx, 'game:profile.unranked'),
          inline: true,
        },
        { name: tt(ctx, 'game:profile.titleField'), value: title, inline: true },
      );
    await ctx.reply({ embeds: [embed] });
  }
}
