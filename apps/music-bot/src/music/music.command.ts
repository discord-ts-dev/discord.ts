import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireBotPermissions } from '@discord.ts/core';
import { paginate } from '@discord.ts/ux';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { PlayDto, RemoveDto, SeekDto, VolumeDto } from './dto/music.dto.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { LocaleService, localeService } from './locale.service.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';
import { chunk, formatTime, parseSeek } from './format.js';
import {
  NON_PREMIUM_QUEUE_CAP,
  guildIdOf,
  trackLine,
  userIdOf,
  voiceChannelIdOf,
  type Ctx,
} from './music-helpers.js';

@Injectable()
export class MusicCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;
  private readonly locale: LocaleService = localeService;
  private readonly premium: PremiumService = premiumService;

  private lang(ctx: Ctx): string {
    return this.premium.languageOf(guildIdOf(ctx));
  }

  private capped(ctx: Ctx): boolean {
    const guildId = guildIdOf(ctx);
    if (!guildId) return true;
    if (this.premium.isPremium(guildId, userIdOf(ctx))) return false;
    return this.music.queueOf(guildId).tracks.length >= NON_PREMIUM_QUEUE_CAP;
  }

  @Command({ name: 'join', description: 'Join your voice channel', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async join(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    const channelId = voiceChannelIdOf(ctx);
    if (!guildId || !channelId) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.voice.not_in_voice'));
      return;
    }
    const live = await this.lavalink.join(guildId, channelId, ctx.channelId);
    await ctx.reply(
      live
        ? `Joined <#${channelId}>.`
        : `Join <#${channelId}>: player connects once a Lavalink node is live.`,
    );
  }

  @Command({ name: 'leave', description: 'Leave voice channel', slash: true, prefix: true })
  @Cooldown(5)
  async leave(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.clear(guildId);
    this.music.queueOf(guildId).current = null;
    void this.lavalink.leave(guildId);
    await ctx.reply('Left voice channel and cleared queue.');
  }

  @Command({ name: 'play', description: 'Play a song or URL', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async play(@Context() ctx: Ctx, @Options() dto: PlayDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    if (!voiceChannelIdOf(ctx)) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.voice.not_in_voice'));
      return;
    }
    if (this.capped(ctx)) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.premium.limit'));
      return;
    }
    const tracks = await this.lavalink.search(dto.query, userIdOf(ctx));
    const track = tracks[0]!;
    const pos = this.music.enqueue(guildId, track);
    void this.lavalink.playNow(guildId, tracks);
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
  async playnext(@Context() ctx: Ctx, @Options() dto: PlayDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    if (!voiceChannelIdOf(ctx)) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.voice.not_in_voice'));
      return;
    }
    if (this.capped(ctx)) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.premium.limit'));
      return;
    }
    const [track] = await this.lavalink.search(dto.query, userIdOf(ctx));
    this.music.enqueue(guildId, track!, true);
    void this.lavalink.playNow(guildId, [track!], true);
    await ctx.reply(`Will play next: ${trackLine(track!)}`);
  }

  @Command({ name: 'pause', description: 'Pause playback', slash: true, prefix: true })
  @Cooldown(5)
  async pause(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.queueOf(guildId).paused = true;
    void this.lavalink.pauseLive(guildId, true);
    await ctx.reply('Paused.');
  }

  @Command({ name: 'resume', description: 'Resume playback', slash: true, prefix: true })
  @Cooldown(5)
  async resume(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.queueOf(guildId).paused = false;
    void this.lavalink.pauseLive(guildId, false);
    await ctx.reply('Resumed.');
  }

  @Command({ name: 'skip', description: 'Skip current track', slash: true, prefix: true })
  @Cooldown(5)
  async skip(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const next = this.music.skip(guildId);
    void this.lavalink.skipLive(guildId);
    await ctx.reply(next ? `Skipped. Now: ${trackLine(next)}` : 'Skipped. Queue empty.');
  }

  @Command({ name: 'replay', description: 'Replay current track', slash: true, prefix: true })
  @Cooldown(5)
  async replay(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const current = this.music.queueOf(guildId).current;
    await ctx.reply(current ? `Replaying: ${trackLine(current)}` : 'Nothing to replay.');
  }

  @Command({ name: 'seek', description: 'Seek in current track', slash: true, prefix: true })
  @Cooldown(5)
  async seek(@Context() ctx: Ctx, @Options() dto: SeekDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const ms = parseSeek(dto.time);
    if (ms === null) {
      await ctx.reply('Bad time. Use seconds or 1m30s.');
      return;
    }
    const current = this.music.queueOf(guildId).current;
    void this.lavalink.seekLive(guildId, ms);
    await ctx.reply(current ? `Seek ${current.name} to ${formatTime(ms)}.` : 'Nothing playing.');
  }

  @Command({ name: 'volume', description: 'Set volume 0-200', slash: true, prefix: true })
  @Cooldown(5)
  async volume(@Context() ctx: Ctx, @Options() dto: VolumeDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.queueOf(guildId).volume = dto.level;
    void this.lavalink.volumeLive(guildId, dto.level);
    await ctx.reply(`Volume: ${dto.level}.`);
  }

  @Command({ name: 'queue', description: 'Show current queue', slash: true, prefix: true })
  @Cooldown(5)
  async queue(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const q = this.music.queueOf(guildId);
    if (!q.current && !q.tracks.length) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.common.no_player'));
      return;
    }
    const lines = q.tracks.map((t, i) => `${i + 1}. ${trackLine(t)}`);
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
  async clearqueue(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.clear(guildId);
    await ctx.reply('Queue cleared.');
  }

  @Command({ name: 'shuffle', description: 'Shuffle the queue', slash: true, prefix: true })
  @Cooldown(5)
  async shuffle(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.shuffle(guildId);
    await ctx.reply('Shuffled.');
  }

  @Command({ name: 'remove', description: 'Remove a track by position', slash: true, prefix: true })
  @Cooldown(5)
  async remove(@Context() ctx: Ctx, @Options() dto: RemoveDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const removed = this.music.remove(guildId, dto.index);
    await ctx.reply(removed ? `Removed: ${trackLine(removed)}` : 'Bad index.');
  }
}
