import { Command, Context, Injectable } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { formatTime } from '@discord.ts/utils';
import { EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';

@Injectable()
@RequireGuild()
export class InfoCommand {
  @Command({ name: 'stats', description: 'Show Paw stats', category: 'Utility' })
  async stats(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const memory = process.memoryUsage().heapUsed / (1024 * 1024);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:info.stats-title'))
      .addFields(
        {
          name: tt(ctx, 'game:info.uptime'),
          value: formatTime(ctx.client.uptime ?? 0),
          inline: true,
        },
        {
          name: tt(ctx, 'game:info.guilds'),
          value: String(ctx.client.guilds.cache.size),
          inline: true,
        },
        {
          name: tt(ctx, 'game:info.users'),
          value: String(ctx.client.users.cache.size),
          inline: true,
        },
        { name: tt(ctx, 'game:info.memory'), value: `${memory.toFixed(1)} MB`, inline: true },
        { name: tt(ctx, 'game:info.gateway'), value: `${ctx.client.ws.ping}ms`, inline: true },
      );
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'shard', description: 'Show shard status', category: 'Utility' })
  async shard(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const shard = ctx.client.shard;
    const text = shard
      ? tt(ctx, 'game:info.shard-line', {
          ids: shard.ids.join(', '),
          count: shard.count,
        })
      : tt(ctx, 'game:info.no-shards');
    await ctx.reply(text);
  }

  @Command({
    name: 'guildlink',
    description: 'Create an invite for this server (manage server)',
    category: 'Utility',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async guildlink(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const channel = ctx.channel;
    if (!channel || !('createInvite' in channel)) {
      await replyEphemeral(ctx, tt(ctx, 'game:admin.no-channel'));
      return;
    }
    try {
      const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: true });
      await replyEphemeral(ctx, tt(ctx, 'game:info.invite', { url: invite.url }));
    } catch {
      await replyEphemeral(ctx, tt(ctx, 'game:info.invite-fail'));
    }
  }
}
