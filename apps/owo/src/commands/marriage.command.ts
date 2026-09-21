import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { userIdOf } from '@discord.ts/utils';
import { confirm, deliver, replyEphemeral } from '@discord.ts/ux';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { accept, decline, divorce, propose, relation } from '../game/relations.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { TargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class MarriageCommand {
  @Command({
    name: 'marry',
    description: 'Propose to someone',
    category: 'Social',
    toggleable: true,
  })
  async marry(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:marry.fail'));
    const result = await propose(store, ctx.user.id, target);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, `game:marry.${result.reason}`));
      return;
    }
    await ctx.reply(tt(ctx, 'game:marry.proposed', { user: `<@${target}>` }));
  }

  @Command({
    name: 'accept',
    description: 'Accept a marriage proposal',
    category: 'Social',
    toggleable: true,
  })
  async accept(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TargetDto,
  ): Promise<void> {
    const from = userIdOf(dto.user);
    if (!from) return replyEphemeral(ctx, tt(ctx, 'game:marry.fail'));
    const result = await accept(store, ctx.user.id, from);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, `game:marry.${result.reason}`));
      return;
    }
    await ctx.reply(tt(ctx, 'game:marry.wed', { a: `<@${ctx.user.id}>`, b: `<@${from}>` }));
  }

  @Command({
    name: 'decline',
    description: 'Decline a marriage proposal',
    category: 'Social',
    toggleable: true,
  })
  async decline(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TargetDto,
  ): Promise<void> {
    const from = userIdOf(dto.user);
    if (!from) return replyEphemeral(ctx, tt(ctx, 'game:marry.fail'));
    const result = await decline(store, ctx.user.id, from);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, `game:marry.${result.reason}`));
      return;
    }
    await ctx.reply(tt(ctx, 'game:marry.declined', { user: `<@${from}>` }));
  }

  @Command({
    name: 'divorce',
    description: 'End your marriage',
    category: 'Social',
    toggleable: true,
  })
  async divorce(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const current = await relation(store, ctx.user.id);
    if (!current.spouse) {
      await replyEphemeral(ctx, tt(ctx, 'game:marry.not-married'));
      return;
    }
    const done = await confirm(
      ctx,
      {
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setDescription(
              tt(ctx, 'game:marry.divorce-confirm', { user: `<@${current.spouse}>` }),
            ),
        ],
      },
      { allowedUserId: ctx.user.id },
    );
    if (!done) return;
    const result = await divorce(store, ctx.user.id);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, 'game:marry.not-married'));
      return;
    }
    await deliver(ctx, {
      content: tt(ctx, 'game:marry.divorced', { user: `<@${result.former}>` }),
    });
  }
}
