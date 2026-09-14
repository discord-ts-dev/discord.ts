import { Author, Command, Context, Guild, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireBotPermissions, RequireGuild, t } from '@discord.ts/core';
import { paginate } from '@discord.ts/ux';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild as DiscordGuild,
  type User,
} from 'discord.js';
import { PlayDto, RemoveDto, SeekDto, VolumeDto } from './dto/music.dto.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';
import { chunk, formatTime, parseSeek } from './format.js';
import { NON_PREMIUM_QUEUE_CAP, trackLine, voiceChannelIdOf, type Ctx } from './music-helpers.js';

@Injectable()
@RequireGuild()
export class MusicCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;
  private readonly premium: PremiumService = premiumService;

  private lang(guild: DiscordGuild | null): string {
    return this.premium.languageOf(guild?.id ?? null);
  }

  private capped(guild: DiscordGuild | null, author: User): boolean {
    if (!guild) return true;
    if (this.premium.isPremium(guild.id, author.id)) return false;
    return this.music.queueOf(guild.id).tracks.length >= NON_PREMIUM_QUEUE_CAP;
  }

  @Command({ name: 'join', description: 'Join your voice channel', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async join(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    const channelId = voiceChannelIdOf(ctx);
    if (!guild || !channelId) {
      await ctx.reply(t('error.voice.not_in_voice', undefined, this.lang(guild)));
      return;
    }
    const live = await this.lavalink.join(guild.id, channelId, ctx.channelId);
    await ctx.reply(
      live
        ? `Joined <#${channelId}>.`
        : `Join <#${channelId}>: player connects once a Lavalink node is live.`,
    );
  }

  @Command({ name: 'leave', description: 'Leave voice channel', slash: true, prefix: true })
  @Cooldown(5)
  async leave(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    this.music.clear(guild.id);
    this.music.queueOf(guild.id).current = null;
    void this.lavalink.leave(guild.id);
    await ctx.reply('Left voice channel and cleared queue.');
  }

  @Command({ name: 'play', description: 'Play a song or URL', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async play(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Author() author: User,
    @Options() dto: PlayDto,
  ): Promise<void> {
    if (!guild) return;
    if (!voiceChannelIdOf(ctx)) {
      await ctx.reply(t('error.voice.not_in_voice', undefined, this.lang(guild)));
      return;
    }
    if (this.capped(guild, author)) {
      await ctx.reply(t('error.premium.limit', undefined, this.lang(guild)));
      return;
    }
    const tracks = await this.lavalink.search(dto.query, author.id);
    const track = tracks[0]!;
    const pos = this.music.enqueue(guild.id, track);
    void this.lavalink.playNow(guild.id, tracks);
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setDescription(
        pos === 0 ? `Now playing: ${trackLine(track)}` : `Queued #${pos}: ${trackLine(track)}`,
      );
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'playnext', description: 'Add a song to play next', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async playnext(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Author() author: User,
    @Options() dto: PlayDto,
  ): Promise<void> {
    if (!guild) return;
    if (!voiceChannelIdOf(ctx)) {
      await ctx.reply(t('error.voice.not_in_voice', undefined, this.lang(guild)));
      return;
    }
    if (this.capped(guild, author)) {
      await ctx.reply(t('error.premium.limit', undefined, this.lang(guild)));
      return;
    }
    const [track] = await this.lavalink.search(dto.query, author.id);
    this.music.enqueue(guild.id, track!, true);
    void this.lavalink.playNow(guild.id, [track!], true);
    await ctx.reply(`Will play next: ${trackLine(track!)}`);
  }

  @Command({ name: 'pause', description: 'Pause playback', slash: true, prefix: true })
  @Cooldown(5)
  async pause(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    this.music.queueOf(guild.id).paused = true;
    void this.lavalink.pauseLive(guild.id, true);
    await ctx.reply('Paused.');
  }

  @Command({ name: 'resume', description: 'Resume playback', slash: true, prefix: true })
  @Cooldown(5)
  async resume(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    this.music.queueOf(guild.id).paused = false;
    void this.lavalink.pauseLive(guild.id, false);
    await ctx.reply('Resumed.');
  }

  @Command({ name: 'skip', description: 'Skip current track', slash: true, prefix: true })
  @Cooldown(5)
  async skip(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    const next = this.music.skip(guild.id);
    void this.lavalink.skipLive(guild.id);
    await ctx.reply(next ? `Skipped. Now: ${trackLine(next)}` : 'Skipped. Queue empty.');
  }

  @Command({ name: 'replay', description: 'Replay current track', slash: true, prefix: true })
  @Cooldown(5)
  async replay(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    const current = this.music.queueOf(guild.id).current;
    await ctx.reply(current ? `Replaying: ${trackLine(current)}` : 'Nothing to replay.');
  }

  @Command({ name: 'seek', description: 'Seek in current track', slash: true, prefix: true })
  @Cooldown(5)
  async seek(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: SeekDto,
  ): Promise<void> {
    if (!guild) return;
    const ms = parseSeek(dto.time);
    if (ms === null) {
      await ctx.reply('Bad time. Use seconds or 1m30s.');
      return;
    }
    const current = this.music.queueOf(guild.id).current;
    void this.lavalink.seekLive(guild.id, ms);
    await ctx.reply(current ? `Seek ${current.name} to ${formatTime(ms)}.` : 'Nothing playing.');
  }

  @Command({ name: 'volume', description: 'Set volume 0-200', slash: true, prefix: true })
  @Cooldown(5)
  async volume(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: VolumeDto,
  ): Promise<void> {
    if (!guild) return;
    this.music.queueOf(guild.id).volume = dto.level;
    void this.lavalink.volumeLive(guild.id, dto.level);
    await ctx.reply(`Volume: ${dto.level}.`);
  }

  @Command({ name: 'queue', description: 'Show current queue', slash: true, prefix: true })
  @Cooldown(5)
  async queue(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    const q = this.music.queueOf(guild.id);
    if (!q.current && !q.tracks.length) {
      await ctx.reply(t('error.common.no_player', undefined, this.lang(guild)));
      return;
    }
    const lines = q.tracks.map((track, i) => `${i + 1}. ${trackLine(track)}`);
    const pages = chunk(lines.length ? lines : ['(empty)'], 10).map((page, i, all) =>
      new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setDescription(
          [`Now: ${q.current ? trackLine(q.current) : '(empty)'}`, '', ...page].join('\n'),
        )
        .setFooter({ text: `Page ${i + 1}/${all.length}` }),
    );
    await paginate(ctx as never, pages);
  }

  @Command({ name: 'clearqueue', description: 'Clear the queue', slash: true, prefix: true })
  @Cooldown(5)
  async clearqueue(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    this.music.clear(guild.id);
    await ctx.reply('Queue cleared.');
  }

  @Command({ name: 'shuffle', description: 'Shuffle the queue', slash: true, prefix: true })
  @Cooldown(5)
  async shuffle(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    if (!guild) return;
    this.music.shuffle(guild.id);
    await ctx.reply('Shuffled.');
  }

  @Command({ name: 'remove', description: 'Remove a track by position', slash: true, prefix: true })
  @Cooldown(5)
  async remove(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: RemoveDto,
  ): Promise<void> {
    if (!guild) return;
    const removed = this.music.remove(guild.id, dto.index);
    await ctx.reply(removed ? `Removed: ${trackLine(removed)}` : 'Bad index.');
  }
}
