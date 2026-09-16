import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { getBalance } from '@discord.ts/systems';
import { userIdOf } from '@discord.ts/utils';
import { confirm } from '@discord.ts/ux';
import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { setZoo } from '../game/zoo.js';
import type { ResetDto } from './dto/owo.dto.js';

@Injectable()
@RequireGuild()
export class ResetCommand {
  @Command({ name: 'reset', description: 'Wipe pawcoins or zoo for a user (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async reset(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ResetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) {
      await ctx.reply({ content: tt(ctx, 'game:reset.fail'), flags: MessageFlags.Ephemeral });
      return;
    }

    const what = dto.what === 'coins' ? 'pawcoins' : dto.what === 'zoo' ? 'zoo' : 'everything';
    const accepted = await confirm(ctx, {
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.error)
          .setDescription(tt(ctx, 'game:reset.confirm', { what, user: `<@${target}>` })),
      ],
    });
    if (!accepted) return;

    if (dto.what === 'coins' || dto.what === 'all') {
      const balance = await getBalance(store, target);
      if (balance !== 0) await credit(store, target, -balance);
    }
    if (dto.what === 'zoo' || dto.what === 'all') {
      await setZoo(store, target, {});
    }
    if (dto.what === 'all') {
      // ponytail: matches the shop's `inv:` key scheme (packages/systems/src/shop.ts).
      // Move to a systems bulk-clear if that key scheme ever changes.
      await store.del(`inv:${target}`);
      await store.del(`title:${target}`);
    }

    await ctx.reply({
      content: tt(ctx, 'game:reset.done', { what, user: `<@${target}>` }),
      flags: MessageFlags.Ephemeral,
    });
  }
}
