import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { userIdOf } from '@discord.ts/utils';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS, SHOP_ITEMS } from '../game/config.js';
import { weaponById } from '../game/battle.js';
import {
  acceptTrade,
  cancelTrade,
  getTrade,
  proposeTrade,
  type TradeOffer,
} from '../game/trade.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { TradeDto } from './dto/community.dto.js';

const ACCEPT_ID = /^owo:tr:a_/;
const DECLINE_ID = /^owo:tr:d_/;

@Injectable()
@PlayerGuarded()
export class TradeCommand {
  @Command({ name: 'trade', description: 'Offer an item to another user' })
  async trade(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TradeDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target || target === ctx.user.id) {
      await replyEphemeral(ctx, tt(ctx, 'game:trade.bad-target'));
      return;
    }
    const qty = dto.count ?? 1;
    const id = `${ctx.channelId ?? 'dm'}_${ctx.user.id}_${target}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await proposeTrade(store, id, ctx.user.id, target, dto.item, qty);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, 'game:trade.no-item'));
      return;
    }
    const embed = new EmbedBuilder().setColor(COLORS.gold).setDescription(
      tt(ctx, 'game:trade.offer', {
        from: ctx.user.id,
        to: target,
        count: qty,
        item: itemName(dto.item),
      }),
    );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`owo:tr:a_${id}`)
        .setLabel(tt(ctx, 'game:trade.accept'))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`owo:tr:d_${id}`)
        .setLabel(tt(ctx, 'game:trade.decline'))
        .setStyle(ButtonStyle.Secondary),
    );
    await ctx.reply({ embeds: [embed], components: [row] });
  }

  @Button(ACCEPT_ID)
  async accept(@Context() ix: ButtonInteraction): Promise<void> {
    const id = ix.customId.replace(ACCEPT_ID, '');
    const offer = await this.resolveOffer(ix, id, 'receiver');
    if (!offer) return;
    const result = await acceptTrade(store, id, ix.user.id);
    if (!result.ok) {
      await replyEphemeral(ix, tt(ix, `game:trade.${result.reason}`));
      return;
    }
    await ix.update({
      embeds: [
        new EmbedBuilder().setColor(COLORS.success).setDescription(
          tt(ix, 'game:trade.done', {
            from: offer.from,
            to: offer.to,
            count: offer.qty,
            item: itemName(offer.itemId),
          }),
        ),
      ],
      components: [],
    });
  }

  @Button(DECLINE_ID)
  async decline(@Context() ix: ButtonInteraction): Promise<void> {
    const id = ix.customId.replace(DECLINE_ID, '');
    const offer = await this.resolveOffer(ix, id, 'either');
    if (!offer) return;
    await cancelTrade(store, id);
    await ix.update({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.error)
          .setDescription(tt(ix, 'game:trade.declined', { user: ix.user.id })),
      ],
      components: [],
    });
  }

  /** Load an offer and check the presser. Replies and returns null when refused. */
  private async resolveOffer(
    ix: ButtonInteraction,
    id: string,
    roles: 'receiver' | 'either',
  ): Promise<TradeOffer | null> {
    const offer = await getTrade(store, id);
    if (!offer) {
      await replyEphemeral(ix, tt(ix, 'game:trade.expired'));
      return null;
    }
    const allowed =
      roles === 'receiver'
        ? offer.to === ix.user.id
        : offer.to === ix.user.id || offer.from === ix.user.id;
    if (!allowed) {
      await replyEphemeral(ix, tt(ix, 'game:trade.not-yours'));
      return null;
    }
    return offer;
  }
}

function itemName(itemId: string): string {
  const shopItem = SHOP_ITEMS.find((item) => item.id === itemId);
  if (shopItem) return shopItem.name;
  const weaponId = itemId.startsWith('weapon-') ? itemId.slice('weapon-'.length) : '';
  const weapon = weaponById(weaponId);
  return weapon ? weapon.name : itemId;
}
