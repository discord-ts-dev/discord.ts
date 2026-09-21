import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { getBalance, rankOf } from '@discord.ts/systems';
import { progressBar, userIdOf } from '@discord.ts/utils';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { XP_BOARD } from '../game/economy.js';
import { xpToNext } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { UserTargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class LevelCommand {
  @Command({
    name: 'level',
    description: 'Show XP, level, and progress',
    category: 'Gameplay',
    toggleable: true,
  })
  async level(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user) ?? ctx.user.id;
    const [rank, balance] = await Promise.all([
      rankOf(store, XP_BOARD, target),
      getBalance(store, target),
    ]);
    const xp = rank?.score ?? 0;
    const { level, into, need } = xpToNext(xp);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:level.title', { user: `<@${target}>` }))
      .setDescription(`**${level}** ${progressBar(into, need)}`)
      .addFields(
        {
          name: tt(ctx, 'game:level.xp'),
          value: fmt(xp),
          inline: true,
        },
        {
          name: tt(ctx, 'game:profile.rank'),
          value: rank ? `#${rank.rank}` : tt(ctx, 'game:me.unranked'),
          inline: true,
        },
        { name: tt(ctx, 'game:profile.balance'), value: fmt(balance), inline: true },
      );
    await ctx.reply({ embeds: [embed] });
  }
}
