import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { userIdOf } from '@discord.ts/utils';
import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { GiveDto } from './dto/owo.dto.js';

@Injectable()
@RequireGuild()
export class GiveCommand {
  @Command({
    name: 'give',
    description: 'Grant pawcoins to a user (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async give(@Context() ctx: ChatInputCommandInteraction, @Options() dto: GiveDto): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) {
      await ctx.reply({
        content: tt(ctx, 'game:give.fail'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const balance = await credit(store, target, dto.amount);
    await ctx.reply({
      content: tt(ctx, 'game:give.done', {
        amount: fmt(dto.amount),
        user: target,
        balance: fmt(balance),
      }),
      flags: MessageFlags.Ephemeral,
    });
  }
}
