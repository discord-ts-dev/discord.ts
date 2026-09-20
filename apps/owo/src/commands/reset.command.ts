import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { getBalance } from '@discord.ts/systems';
import { userIdOf } from '@discord.ts/utils';
import { confirm, replyEphemeral } from '@discord.ts/ux';
import { EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
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
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:reset.fail'));

    const what = dto.what === 'coins' ? 'pawcoins' : dto.what === 'zoo' ? 'zoo' : 'everything';
    const accepted = await confirm(
      ctx,
      {
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setDescription(tt(ctx, 'game:reset.confirm', { what, user: `<@${target}>` })),
        ],
      },
      { allowedUserId: ctx.user.id },
    );
    if (!accepted) return;

    if (dto.what === 'coins' || dto.what === 'all') {
      const balance = await getBalance(store, target);
      if (balance !== 0) await credit(store, target, -balance);
    }
    if (dto.what === 'zoo' || dto.what === 'all') {
      await setZoo(store, target, {});
    }
    if (dto.what === 'all') {
      // ponytail: raw `inv:` delete per the documented store key scheme
      // (packages/systems/CONTEXT.md). Move to a systems bulk-clear if it changes.
      await store.del(`inv:${target}`);
      await store.del(`title:${target}`);
    }

    await replyEphemeral(ctx, tt(ctx, 'game:reset.done', { what, user: `<@${target}>` }));
  }
}
