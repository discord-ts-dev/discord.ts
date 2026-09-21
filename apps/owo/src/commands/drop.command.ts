import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { readBet } from './bet.js';
import { COLORS } from '../game/config.js';
import { claimDrop, createDrop } from '../game/drop.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { BetDto } from './dto/owo.dto.js';

const CLAIM_ID = /^owo:drop_/;

@Injectable()
@PlayerGuarded()
export class DropCommand {
  @Command({
    name: 'drop',
    description: 'Drop pawcoins for anyone to grab',
    category: 'Economy',
    toggleable: true,
  })
  @Cooldown(10)
  async drop(@Context() ctx: ChatInputCommandInteraction, @Options() dto: BetDto): Promise<void> {
    const amount = await readBet(ctx, dto.amount);
    if (amount === null) return;

    const channelId = ctx.channelId ?? 'dm';
    await credit(store, ctx.user.id, -amount);
    await createDrop(store, channelId, amount);

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setDescription(tt(ctx, 'game:drop.dropped', { amount: fmt(amount) }));
    const components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`owo:drop_${channelId}`)
          .setLabel(tt(ctx, 'game:drop.button'))
          .setStyle(ButtonStyle.Success),
      ),
    ];
    await ctx.reply({ embeds: [embed], components });
  }

  @Button(CLAIM_ID)
  async claim(@Context() ix: ButtonInteraction): Promise<void> {
    const channelId = ix.customId.replace(CLAIM_ID, '');
    const result = await claimDrop(store, channelId);
    if (!result.ok) {
      await ix.reply({
        content: tt(ix, result.reason === 'taken' ? 'game:drop.taken' : 'game:drop.gone'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const balance = await credit(store, ix.user.id, result.amount);
    await ix.reply(
      tt(ix, 'game:drop.claimed', {
        amount: fmt(result.amount),
        user: ix.user.id,
        balance: fmt(balance),
      }),
    );
    await ix.message.edit({ components: [] });
  }
}
