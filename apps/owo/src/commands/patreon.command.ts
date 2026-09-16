import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireOwner } from '@discord.ts/core';
import { userIdOf } from '@discord.ts/utils';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS } from '../game/config.js';
import {
  isPremiumTier,
  premiumTierOf,
  setPremiumTier,
  shopPrice,
  TIER_PERKS,
} from '../game/premium.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { SetTierDto } from './dto/community.dto.js';

@Injectable()
export class PatreonCommand {
  @Command({ name: 'patreon', description: 'Support Paw and see premium perks' })
  @PlayerGuarded()
  async patreon(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const tier = await premiumTierOf(store, ctx.user.id);
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:patreon.title'))
      .setDescription(tt(ctx, 'game:patreon.body'))
      .addFields(
        {
          name: tt(ctx, 'game:patreon.your-tier'),
          value: tt(ctx, `game:premium.tier.${tier}`),
          inline: true,
        },
        {
          name: tt(ctx, 'game:patreon.perks'),
          value: TIER_PERKS[tier].join(', ') || tt(ctx, 'game:patreon.no-perks'),
        },
      )
      .setFooter({
        text: tt(ctx, 'game:premium.example', { price: shopPrice(1000, 'patron') }),
      });
    await ctx.reply({ embeds: [embed] });
  }

  // The owner grant is deliberately outside PlayerGuarded: a paused or
  // guild-disabled bot must still be fixable.
  @Command({ name: 'settier', description: 'Grant a premium tier to a user (bot owner)' })
  @RequireOwner()
  async settier(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: SetTierDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:fail.user'));
    if (!isPremiumTier(dto.tier)) return replyEphemeral(ctx, tt(ctx, 'game:premium.unknown'));
    await setPremiumTier(store, target, dto.tier);
    await replyEphemeral(ctx, tt(ctx, 'game:premium.set', { user: target, tier: dto.tier }));
  }
}
