import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { userIdOf } from '@discord.ts/utils';
import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { banOf, banUser, bans, unbanUser } from '../game/bans.js';
import { COLORS } from '../game/config.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import type { BanDto, TargetDto, UserTargetDto } from './dto/owo.dto.js';

@Injectable()
@RequireGuild()
export class BanCommand {
  @Command({ name: 'ban', description: 'Ban a user from Paw (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async ban(@Context() ctx: ChatInputCommandInteraction, @Options() dto: BanDto): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:ban.fail'));
    const reason = dto.reason ?? 'no reason given';
    await banUser(store, target, reason);
    await replyEphemeral(ctx, tt(ctx, 'game:ban.done', { user: target, reason }));
  }

  @Command({ name: 'unban', description: 'Lift a Paw ban (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async unban(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:ban.fail'));
    const lifted = await unbanUser(store, target);
    await replyEphemeral(
      ctx,
      lifted
        ? tt(ctx, 'game:ban.lifted', { user: target })
        : tt(ctx, 'game:ban.not-banned', { user: target }),
    );
  }

  @Command({ name: 'banstatus', description: 'Show Paw bans (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async banstatus(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    const embed = new EmbedBuilder().setTitle(tt(ctx, 'game:ban.list-title'));

    if (!target) {
      const entries = Object.entries(await bans(store));
      embed.setColor(entries.length ? COLORS.error : COLORS.success).setDescription(
        entries.length
          ? entries
              .map(([userId, record]) =>
                tt(ctx, 'game:ban.list-line', {
                  user: userId,
                  reason: record.reason,
                  at: Math.floor(record.at / 1000),
                }),
              )
              .join('\n')
          : tt(ctx, 'game:ban.list-empty'),
      );
      await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const record = await banOf(store, target);
    embed.setColor(record ? COLORS.error : COLORS.success).setDescription(
      record
        ? tt(ctx, 'game:ban.status-banned', {
            reason: record.reason,
            at: Math.floor(record.at / 1000),
          })
        : tt(ctx, 'game:ban.not-banned', { user: target }),
    );
    await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
