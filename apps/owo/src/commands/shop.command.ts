import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { addScore, buy, getBalance, inventory, useItem } from '@discord.ts/systems';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS, SHOP_ITEMS } from '../game/config.js';
import { WEALTH_BOARD } from '../game/economy.js';
import { pickAnimal } from '../game/rng.js';
import { RARITIES } from '../game/roster.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { addAnimal } from '../game/zoo.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { ShopItemDto } from './dto/owo.dto.js';

const Shop = createCommandGroupDecorator({ name: 'shop', description: 'Paw shop and bag' });

@Injectable()
@GuildToggleable()
@Shop()
export class ShopCommand {
  @Subcommand({ name: 'list', description: 'List shop items' })
  async list(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const balance = await getBalance(store, ctx.user.id);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:shop.title'))
      .setDescription(
        SHOP_ITEMS.map((item) =>
          tt(ctx, 'game:shop.list-line', {
            name: item.name,
            price: fmt(item.price),
            description: item.description,
          }),
        ).join('\n\n'),
      )
      .setFooter({ text: tt(ctx, 'game:shop.balance', { balance: fmt(balance) }) });
    await ctx.reply({ embeds: [embed] });
  }

  @Subcommand({ name: 'buy', description: 'Buy an item' })
  async buy(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ShopItemDto,
  ): Promise<void> {
    const item = SHOP_ITEMS.find((i) => i.id === dto.item);
    if (!item) {
      await ctx.reply({
        content: tt(ctx, 'game:shop.unknown-item'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const result = await buy(store, ctx.user.id, { id: item.id, price: item.price });
    if (!result.ok) {
      await ctx.reply({
        content: tt(ctx, 'game:shop.buy-fail', {
          name: item.name,
          price: fmt(item.price),
          balance: fmt(result.balance),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await addScore(store, WEALTH_BOARD, ctx.user.id, -item.price);
    await ctx.reply({
      content: tt(ctx, 'game:shop.buy-ok', {
        name: item.name,
        price: fmt(item.price),
        balance: fmt(result.balance),
      }),
    });
  }

  // ponytail: one branch per item id. Split into per-item handlers when the
  // item list grows past a handful.
  @Subcommand({ name: 'use', description: 'Use an item from your bag' })
  async use(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ShopItemDto,
  ): Promise<void> {
    const item = SHOP_ITEMS.find((i) => i.id === dto.item);
    if (!item) {
      await ctx.reply({
        content: tt(ctx, 'game:shop.unknown-item'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const used = await useItem(store, ctx.user.id, item.id);
    if (!used) {
      await ctx.reply({
        content: tt(ctx, 'game:shop.use-fail', { name: item.name }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (item.id === 'lootbox') {
      const animal = pickAnimal();
      const count = await addAnimal(store, ctx.user.id, animal.id);
      await ctx.reply({
        content: tt(ctx, 'game:shop.lootbox', {
          animal: `${animal.emoji} **${animal.name}**`,
          rarity: RARITIES[animal.rarity].label,
          count,
        }),
      });
      return;
    }

    if (item.id === 'title-star') {
      await store.set(`title:${ctx.user.id}`, item.id);
      await ctx.reply({ content: tt(ctx, 'game:shop.title-owned', { title: '★ Star' }) });
      return;
    }

    await ctx.reply({ content: tt(ctx, 'game:shop.use-ok', { name: item.name }) });
  }

  @Subcommand({ name: 'inventory', description: 'Show your items' })
  async bag(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const inv = await inventory(store, ctx.user.id);
    const lines = Object.entries(inv)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const item = SHOP_ITEMS.find((i) => i.id === id);
        return tt(ctx, 'game:shop.inventory-line', {
          name: item?.name ?? id,
          count,
        });
      });

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:shop.inventory-title', { user: `<@${ctx.user.id}>` }));
    if (!lines.length) {
      embed.setDescription(tt(ctx, 'game:shop.inventory-empty'));
    } else {
      embed.setDescription(lines.join('\n'));
    }
    await ctx.reply({ embeds: [embed] });
  }
}
