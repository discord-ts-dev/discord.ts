import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { userIdOf } from '@discord.ts/utils';
import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { isPaused, setPaused, warnUser, warningsOf } from '../game/warns.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { BotReplyDto, EchoDto, WarnDto } from './dto/community.dto.js';

@Injectable()
@RequireGuild()
export class AdminCommand {
  @Command({
    name: 'echo',
    description: 'Make the bot say something (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async echo(@Context() ctx: ChatInputCommandInteraction, @Options() dto: EchoDto): Promise<void> {
    const channel = ctx.channel;
    if (!channel || !('send' in channel)) {
      await replyEphemeral(ctx, tt(ctx, 'game:admin.no-channel'));
      return;
    }
    await channel.send(dto.text);
    await replyEphemeral(ctx, tt(ctx, 'game:admin.echo-sent'));
  }

  @Command({
    name: 'reply',
    description: 'Reply to a message as the bot (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async reply(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: BotReplyDto,
  ): Promise<void> {
    const channel = ctx.channel;
    if (!channel || !('messages' in channel)) {
      await replyEphemeral(ctx, tt(ctx, 'game:admin.no-channel'));
      return;
    }
    try {
      const message = await channel.messages.fetch(dto.messageId);
      await message.reply(dto.text);
      await replyEphemeral(ctx, tt(ctx, 'game:admin.reply-sent'));
    } catch {
      await replyEphemeral(ctx, tt(ctx, 'game:admin.reply-fail'));
    }
  }

  @Command({ name: 'warn', description: 'Warn a user (manage server)', category: 'Admin' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async warn(@Context() ctx: ChatInputCommandInteraction, @Options() dto: WarnDto): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:fail.user'));
    const list = await warnUser(store, target, dto.reason);
    await replyEphemeral(
      ctx,
      tt(ctx, 'game:admin.warned', { user: target, count: list.length, reason: dto.reason }),
    );
  }

  @Command({
    name: 'warnings',
    description: 'Show warnings for a user (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async warnings(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: WarnDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) return replyEphemeral(ctx, tt(ctx, 'game:fail.user'));
    const list = await warningsOf(store, target);
    await replyEphemeral(
      ctx,
      list.length
        ? list.map((w) => `• ${w.reason} (<t:${Math.floor(w.at / 1000)}:R>)`).join('\n')
        : tt(ctx, 'game:admin.no-warnings', { user: target }),
    );
  }

  @Command({
    name: 'pausebot',
    description: 'Pause or resume Paw for everyone (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async pausebot(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const next = !(await isPaused(store));
    await setPaused(store, next);
    await ctx.reply({
      content: tt(ctx, next ? 'game:admin.paused' : 'game:admin.resumed'),
      flags: MessageFlags.Ephemeral,
    });
  }
}
