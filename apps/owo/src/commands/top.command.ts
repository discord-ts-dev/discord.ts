import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { rankOf, top } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { WEALTH_BOARD, XP_BOARD, ZOO_BOARD } from '../game/economy.js';
import { levelFromXp } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { TopDto } from './dto/owo.dto.js';

const LIMIT = 10;

const BOARDS = [XP_BOARD, WEALTH_BOARD, ZOO_BOARD] as const;

@Injectable()
@PlayerGuarded()
export class TopCommand {
  @Command({
    name: 'top',
    description: 'Leaderboards: XP, wealth, or zoo size',
    category: 'Economy',
    toggleable: true,
  })
  async top(@Context() ctx: ChatInputCommandInteraction, @Options() dto: TopDto): Promise<void> {
    const board = BOARDS.find((b) => b === (dto.board ?? XP_BOARD)) ?? XP_BOARD;
    const [rows, mine] = await Promise.all([
      top(store, board, LIMIT),
      rankOf(store, board, ctx.user.id),
    ]);

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:top.title', { board: tt(ctx, `game:top.board-${board}`) }));
    if (!rows.length) {
      embed.setDescription(tt(ctx, 'game:top.empty'));
      await ctx.reply({ embeds: [embed] });
      return;
    }

    embed
      .setDescription(
        rows
          .map((row, i) =>
            board === XP_BOARD
              ? tt(ctx, 'game:top.line', {
                  n: i + 1,
                  member: row.member,
                  score: fmt(row.score),
                  level: levelFromXp(row.score),
                })
              : tt(ctx, 'game:top.line-plain', {
                  n: i + 1,
                  member: row.member,
                  score: fmt(row.score),
                }),
          )
          .join('\n'),
      )
      .setFooter({
        text: mine
          ? tt(ctx, 'game:top.your-rank', { rank: mine.rank, score: fmt(mine.score) })
          : tt(ctx, 'game:top.unranked'),
      });
    await ctx.reply({ embeds: [embed] });
  }
}
