import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequireOwner, RequirePermissions } from '@discord.ts/core';
import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { replyEphemeral } from './bet.js';
import { announceChannelOf, announceGuilds, setAnnounceChannel } from '../game/community.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { knownUsers } from '../game/users.js';
import type {
  AnnounceChannelDto,
  AnnounceDto,
  DmUsersDto,
  GiveAllDto,
} from './dto/community.dto.js';

// ponytail: broadcast caps. Discord rate limits do the rest; raise when the
// user index moves to SQL and a real queue exists.
const MAX_ANNOUNCE_GUILDS = 50;
const MAX_DM_USERS = 200;

@Injectable()
@RequireGuild()
export class BroadcastCommand {
  @Command({
    name: 'setannouncement',
    description: 'Pick this server announcement channel (manage server)',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async setannouncement(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: AnnounceChannelDto,
  ): Promise<void> {
    await setAnnounceChannel(store, (ctx.guild as { id: string }).id, dto.channel.id);
    await replyEphemeral(ctx, tt(ctx, 'game:broadcast.set', { channel: dto.channel.id }));
  }

  @Command({
    name: 'announcement',
    description: 'Post to every server announcement channel (bot owner)',
  })
  @RequireOwner()
  async announcement(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: AnnounceDto,
  ): Promise<void> {
    const guilds = (await announceGuilds(store)).slice(0, MAX_ANNOUNCE_GUILDS);
    const sent = await Promise.all(
      guilds.map(async (guildId) => {
        const channelId = await announceChannelOf(store, guildId);
        if (!channelId) return false;
        try {
          const channel = await ctx.client.channels.fetch(channelId);
          if (!channel || !channel.isTextBased() || !('send' in channel)) return false;
          await (channel as TextChannel).send(dto.text);
          return true;
        } catch {
          return false;
        }
      }),
    );
    await replyEphemeral(
      ctx,
      tt(ctx, 'game:broadcast.announced', { count: sent.filter(Boolean).length }),
    );
  }

  @Command({ name: 'giveall', description: 'Grant pawcoins to every known user (bot owner)' })
  @RequireOwner()
  async giveall(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: GiveAllDto,
  ): Promise<void> {
    const users = await knownUsers(store);
    await Promise.all(users.map((userId) => credit(store, userId, dto.amount)));
    await replyEphemeral(
      ctx,
      tt(ctx, 'game:broadcast.gave', { amount: fmt(dto.amount), count: users.length }),
    );
  }

  @Command({ name: 'msgusers', description: 'DM every known user (bot owner)' })
  @RequireOwner()
  async msgusers(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: DmUsersDto,
  ): Promise<void> {
    const users = (await knownUsers(store)).slice(0, MAX_DM_USERS);
    const sent = await Promise.all(
      users.map(async (userId) => {
        try {
          const user = await ctx.client.users.fetch(userId);
          await user.send(dto.text);
          return true;
        } catch {
          return false;
        }
      }),
    );
    await ctx.reply({
      content: tt(ctx, 'game:broadcast.dmed', { count: sent.filter(Boolean).length }),
      flags: MessageFlags.Ephemeral,
    });
  }
}
