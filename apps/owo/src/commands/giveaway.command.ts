import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS } from '../game/config.js';
import { enterGiveaway, startGiveaway } from '../game/giveaway.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { GiveawayDto } from './dto/community.dto.js';

const ENTER_ID = /^owo:gv:e_/;

@Injectable()
@PlayerGuarded()
@RequireGuild()
export class GiveawayCommand {
  @Command({ name: 'giveaway', description: 'Start a giveaway (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async giveaway(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: GiveawayDto,
  ): Promise<void> {
    const id = `${ctx.channelId ?? 'dm'}_${Math.random().toString(36).slice(2, 10)}`;
    const winners = dto.winners ?? 1;
    await startGiveaway(store, {
      id,
      prize: dto.prize,
      winners,
      endsAt: Date.now() + dto.minutes * 60_000,
      hostId: ctx.user.id,
      channelId: ctx.channelId ?? '',
    });
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:giveaway.title'))
      .setDescription(
        tt(ctx, 'game:giveaway.body', {
          prize: dto.prize,
          winners,
          minutes: dto.minutes,
          host: ctx.user.id,
        }),
      );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`owo:gv:e_${id}`)
        .setLabel(tt(ctx, 'game:giveaway.enter'))
        .setStyle(ButtonStyle.Success),
    );
    await ctx.reply({ embeds: [embed], components: [row] });
  }

  @Button(ENTER_ID)
  async enter(@Context() ix: ButtonInteraction): Promise<void> {
    const id = ix.customId.replace(ENTER_ID, '');
    const result = await enterGiveaway(store, id, ix.user.id);
    if (!result.ok) {
      await replyEphemeral(
        ix,
        tt(ix, result.reason === 'already' ? 'game:giveaway.already' : 'game:giveaway.expired'),
      );
      return;
    }
    await ix.reply({
      content: tt(ix, 'game:giveaway.entered', { entries: result.entries }),
      flags: MessageFlags.Ephemeral,
    });
  }
}
