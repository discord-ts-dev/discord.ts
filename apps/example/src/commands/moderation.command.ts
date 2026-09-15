import { Command, CommandContext, Context, Injectable, Options } from '@discord.ts/common';
import {
  Cooldown,
  RequireBotPermissions,
  RequireGuild,
  RequirePermissions,
} from '@discord.ts/core';
import { confirm, paginate } from '@discord.ts/ux';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import type {
  ClearDto,
  TargetReasonDto,
  TimeoutDto,
  UnbanDto,
  WarningsDto,
} from './dto/moderation.dto.js';
import {
  applyTimeout,
  audit,
  auditAndLog,
  bulkClear,
  getAuditEntries,
  guildOf,
  modEmbed,
  modId,
  pushWarn,
  replyEmbed,
  replyError,
  userIdOf,
  warnKey,
  warnings,
} from './moderation.helpers.js';

@Injectable()
@RequireGuild()
export class ModerationCommand {
  @Command({ name: 'warn', description: 'Warn a member', slash: true, prefix: true })
  @RequirePermissions(PermissionFlagsBits.ModerateMembers)
  async warn(@Context() ctx: CommandContext, @Options() dto: TargetReasonDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const userId = userIdOf(dto.target);
    if (!userId) return replyError(ctx, 'Unknown user. Mention or id.');
    const reason = dto.reason ?? 'No reason';
    pushWarn({ guildId: guild.id, userId, moderatorId: modId(ctx), reason, at: Date.now() });
    const embed = modEmbed('warn', 0xfee75c)
      .setDescription(`Warned <@${userId}>`)
      .addFields({ name: 'Reason', value: reason.slice(0, 1000) });
    await replyEmbed(ctx, embed);
    auditAndLog(ctx, 'warn', userId, reason);
  }

  @Command({
    name: 'warnings',
    description: 'List warnings for a member',
    slash: true,
    prefix: true,
  })
  @RequirePermissions(PermissionFlagsBits.ModerateMembers)
  async warnings(@Context() ctx: CommandContext, @Options() dto: WarningsDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const userId = userIdOf(dto.target);
    if (!userId) return replyError(ctx, 'Unknown user.');
    const list = warnings.get(warnKey(guild.id, userId)) ?? [];
    if (!list.length) {
      await replyEmbed(
        ctx,
        modEmbed('warnings', 0x57f287).setDescription(`No warnings for <@${userId}>.`),
      );
      return;
    }
    const pages: EmbedBuilder[] = [];
    for (let i = 0; i < list.length; i += 5) {
      const slice = list.slice(i, i + 5);
      pages.push(
        modEmbed('warnings', 0x57f287)
          .setDescription(`Warnings for <@${userId}> (${list.length})`)
          .addFields(
            ...slice.map((w, n) => ({
              name: `#${i + n + 1}`,
              value: `${w.reason.slice(0, 500)}\n<@${w.moderatorId}> <t:${Math.floor(w.at / 1000)}:R>`,
            })),
          ),
      );
    }
    await paginate(ctx, pages);
  }

  @Command({ name: 'kick', description: 'Kick a member', slash: true, prefix: true })
  @RequirePermissions(PermissionFlagsBits.KickMembers)
  @RequireBotPermissions(PermissionFlagsBits.KickMembers)
  async kick(@Context() ctx: CommandContext, @Options() dto: TargetReasonDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const userId = userIdOf(dto.target);
    if (!userId) return replyError(ctx, 'Unknown user.');
    const reason = dto.reason ?? 'No reason';
    try {
      const member = await guild.members.fetch(userId);
      await member.kick(reason);
    } catch {
      return replyError(ctx, 'Kick failed. Check role order.');
    }
    await replyEmbed(
      ctx,
      modEmbed('kick', 0xe67e22)
        .setDescription(`Kicked <@${userId}>`)
        .addFields({ name: 'Reason', value: reason.slice(0, 1000) }),
    );
    auditAndLog(ctx, 'kick', userId, reason);
  }

  @Command({ name: 'ban', description: 'Ban a member (asks confirm)', slash: true, prefix: true })
  @RequirePermissions(PermissionFlagsBits.BanMembers)
  @RequireBotPermissions(PermissionFlagsBits.BanMembers)
  @Cooldown(3)
  async ban(@Context() ctx: CommandContext, @Options() dto: TargetReasonDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const userId = userIdOf(dto.target);
    if (!userId) return replyError(ctx, 'Unknown user.');
    const reason = dto.reason ?? 'No reason';
    const ok = await confirm(ctx, {
      embeds: [modEmbed('ban?', 0xed4245).setDescription(`Ban <@${userId}>?\n${reason}`)],
    });
    if (!ok) return;
    try {
      await guild.members.ban(userId, { reason });
    } catch {
      return replyError(ctx, 'Ban failed. Check role order.');
    }
    await replyEmbed(
      ctx,
      modEmbed('ban', 0xed4245)
        .setDescription(`Banned <@${userId}>`)
        .addFields({ name: 'Reason', value: reason.slice(0, 1000) }),
    );
    auditAndLog(ctx, 'ban', userId, reason);
  }

  @Command({ name: 'unban', description: 'Unban a user id', slash: true, prefix: true })
  @RequirePermissions(PermissionFlagsBits.BanMembers)
  @RequireBotPermissions(PermissionFlagsBits.BanMembers)
  async unban(@Context() ctx: CommandContext, @Options() dto: UnbanDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const reason = dto.reason ?? 'No reason';
    try {
      await guild.members.unban(dto.userId, reason);
    } catch {
      return replyError(ctx, 'Unban failed. Check id and bot permissions.');
    }
    await replyEmbed(ctx, modEmbed('unban', 0x57f287).setDescription(`Unbanned \`${dto.userId}\``));
    auditAndLog(ctx, 'unban', dto.userId, reason);
  }

  @Command({
    name: 'timeout',
    description: 'Timeout a member in minutes',
    slash: true,
    prefix: true,
  })
  @RequirePermissions(PermissionFlagsBits.ModerateMembers)
  @RequireBotPermissions(PermissionFlagsBits.ModerateMembers)
  async timeout(@Context() ctx: CommandContext, @Options() dto: TimeoutDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const userId = userIdOf(dto.target);
    if (!userId) return replyError(ctx, 'Unknown user.');
    const reason = dto.reason ?? 'No reason';
    try {
      await applyTimeout(guild, userId, dto.minutes, reason);
    } catch (err) {
      return replyError(ctx, err instanceof Error ? err.message : 'Timeout failed.');
    }
    await replyEmbed(
      ctx,
      modEmbed('timeout', 0x9b59b6)
        .setDescription(`Timed out <@${userId}> for ${dto.minutes}m`)
        .addFields({ name: 'Reason', value: reason.slice(0, 1000) }),
    );
    auditAndLog(ctx, 'timeout', userId, `${dto.minutes}m: ${reason}`);
  }

  @Command({
    name: 'clear',
    description: 'Bulk delete messages (asks confirm)',
    slash: true,
    prefix: true,
  })
  @RequirePermissions(PermissionFlagsBits.ManageMessages)
  @RequireBotPermissions(PermissionFlagsBits.ManageMessages)
  @Cooldown(5)
  async clear(@Context() ctx: CommandContext, @Options() dto: ClearDto): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const ok = await confirm(ctx, {
      embeds: [modEmbed('clear?', 0x3498db).setDescription(`Delete ${dto.count} messages?`)],
    });
    if (!ok) return;
    try {
      const channel = ctx.channel;
      if (!channel || !('bulkDelete' in channel))
        return replyError(ctx, 'Channel does not support bulk delete.');
      const targetId = userIdOf(dto.target);
      const deleted = await bulkClear(channel, dto.count, targetId);
      await replyEmbed(
        ctx,
        modEmbed('clear', 0x3498db).setDescription(`Deleted ${deleted} messages.`),
        true,
      );
    } catch {
      return replyError(ctx, 'Clear failed. Need <14 day old messages and ManageMessages.');
    }
  }

  @Command({ name: 'logs', description: 'Recent moderation audit', slash: true, prefix: true })
  @RequirePermissions(PermissionFlagsBits.ModerateMembers)
  async logs(@Context() ctx: CommandContext): Promise<void> {
    const guild = guildOf(ctx);
    // ponytail: @RequireGuild() already replied; narrow only
    if (!guild) return;
    const list = audit
      .filter((a) => a.guildId === guild.id)
      .slice(-20)
      .reverse();
    if (!list.length) {
      const native = await getAuditEntries(guild, 10);
      if (!native.length) {
        await replyEmbed(
          ctx,
          modEmbed('logs', 0x95a5a6).setDescription('No audit entries yet.'),
          true,
        );
        return;
      }
      await paginate(ctx, [
        modEmbed('logs', 0x95a5a6)
          .setDescription('Discord audit log')
          .addFields(
            ...native.slice(0, 5).map((a) => ({
              name: `${a.action}`,
              value: `target <@${a.targetId ?? '?'}> by <@${a.executorId ?? '?'}>${a.reason ? `\n${a.reason.slice(0, 300)}` : ''}`,
            })),
          ),
      ]);
      return;
    }
    const pages: EmbedBuilder[] = [];
    for (let i = 0; i < list.length; i += 5) {
      const slice = list.slice(i, i + 5);
      pages.push(
        modEmbed('logs', 0x95a5a6)
          .setDescription(`Last ${list.length} actions`)
          .addFields(
            ...slice.map((a) => ({
              name: `${a.action} - <@${a.userId}>`,
              value: `${a.reason.slice(0, 300)}\nby <@${a.moderatorId}> <t:${Math.floor(a.at / 1000)}:R>`,
            })),
          ),
      );
    }
    await paginate(ctx, pages);
  }
}
