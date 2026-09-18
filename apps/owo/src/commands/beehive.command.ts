import { Context, Injectable, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from './bet.js';
import {
  accruedHoney,
  BEE_PRICE,
  buyBee,
  collectHoney,
  HONEY_CAP_PER_BEE,
  hiveOf,
  HONEY_PER_BEE_PER_HOUR,
  HONEY_PRICE,
  sellHoney,
} from '../game/beehive.js';
import { COLORS } from '../game/config.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

const Beehive = createCommandGroupDecorator({
  name: 'beehive',
  description: 'Passive honey: bees make honey while you are away',
});

@Injectable()
@PlayerGuarded()
@Beehive()
export class BeehiveCommand {
  @Subcommand({ name: 'view', description: 'Show your hive and stored honey' })
  async view(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const hive = await hiveOf(store, ctx.user.id);
    const honey = Math.floor(accruedHoney(hive, Date.now()));
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:beehive.title'))
      .setDescription(
        tt(ctx, 'game:beehive.status', {
          bees: hive.bees,
          honey: fmt(honey),
          cap: fmt(hive.bees * HONEY_CAP_PER_BEE),
        }),
      )
      .setFooter({
        text: tt(ctx, 'game:beehive.rates', {
          price: fmt(BEE_PRICE),
          rate: HONEY_PER_BEE_PER_HOUR,
          honey: fmt(HONEY_PRICE),
        }),
      });
    await ctx.reply({ embeds: [embed] });
  }

  @Subcommand({ name: 'buy', description: 'Buy another bee' })
  async buy(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const result = await buyBee(store, ctx.user.id);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, 'game:beehive.fail', { price: fmt(BEE_PRICE) }));
      return;
    }
    await ctx.reply(tt(ctx, 'game:beehive.bought', { bees: result.bees }));
  }

  @Subcommand({ name: 'collect', description: 'Move accrued honey into storage' })
  async collect(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const { hive, collected } = await collectHoney(store, ctx.user.id);
    await ctx.reply(
      tt(ctx, 'game:beehive.collected', {
        collected: fmt(collected),
        honey: fmt(Math.floor(hive.honey)),
      }),
    );
  }

  @Subcommand({ name: 'sell', description: 'Sell all stored honey for pawcoins' })
  async sell(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const result = await sellHoney(store, ctx.user.id);
    if (result.coins <= 0) {
      await replyEphemeral(ctx, tt(ctx, 'game:beehive.empty'));
      return;
    }
    await ctx.reply(
      tt(ctx, 'game:beehive.sold', { collected: fmt(result.collected), coins: fmt(result.coins) }),
    );
  }
}
