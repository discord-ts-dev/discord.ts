import {
  Author,
  Button,
  Command,
  CommandContext,
  Context,
  Guild,
  Injectable,
  Options,
} from '@discord.ts/common';
import { Cooldown, RequireBotPermissions, RequireGuild, SameVoice } from '@discord.ts/core';
import { t } from '@discord.ts/i18n';
import { paginate, pickOne } from '@discord.ts/ux';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Guild as DiscordGuild,
  type User,
} from 'discord.js';
import { LoopDto, LyricDto, SearchDto, ToggleDto } from './dto/music.dto.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { LyricService, lyricService } from './lyric.service.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';
import { formatTime, progressBar } from '@discord.ts/utils';
import { NON_PREMIUM_QUEUE_CAP, trackLine } from './music-helpers.js';

@Injectable()
@RequireGuild()
export class MusicHudCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;
  private readonly lyrics: LyricService = lyricService;
  private readonly premium: PremiumService = premiumService;

  private lang(guild: DiscordGuild | null): string {
    return this.premium.languageOf(guild?.id ?? null);
  }

  private controlRow(guildId: string): ActionRowBuilder<ButtonBuilder> {
    const q = this.music.queueOf(guildId);
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('music:resume')
        .setEmoji(q.paused ? '▶️' : '⏸️')
        .setStyle(q.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music:skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music:stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('music:loop')
        .setEmoji(q.loop === 'track' ? '🔂' : '🔁')
        .setStyle(q.loop === 'off' ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('music:shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  @Command({ name: 'nowplaying', description: 'Show current track', slash: true, prefix: true })
  @Cooldown(5)
  async nowplaying(
    @Context() ctx: CommandContext,
    @Guild() guild: DiscordGuild | null,
  ): Promise<void> {
    if (!guild) return;
    const q = this.music.queueOf(guild.id);
    if (!q.current) {
      await ctx.reply(t('error.player.no_track_playing', undefined, this.lang(guild)));
      return;
    }
    const total = q.current.duration > 0 ? formatTime(q.current.duration) : 'LIVE';
    const pos = this.lavalink.positionOf(guild.id);
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setDescription(
        `[${q.current.name}](${q.current.uri}) - request by <@${q.current.requesterId ?? 'unknown'}>\n\n\`${progressBar(pos, q.current.duration)}\``,
      )
      .addFields({ name: '​', value: `\`${formatTime(pos)} / ${total}\`` });
    await ctx.reply({ embeds: [embed], components: [this.controlRow(guild.id)] });
  }

  @Command({ name: 'autoplay', description: 'Toggle autoplay', slash: true, prefix: true })
  @Cooldown(5)
  async autoplay(
    @Context() ctx: CommandContext,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    if (!guild) return;
    const q = this.music.queueOf(guild.id);
    q.autoplay = dto.on ?? !q.autoplay;
    this.lavalink.setAutoplay(guild.id, q.autoplay);
    await ctx.reply(`Autoplay: ${q.autoplay ? 'on' : 'off'}.`);
  }

  @Command({ name: 'loop', description: 'Loop track, queue, or off', slash: true, prefix: true })
  @Cooldown(5)
  async loop(
    @Context() ctx: CommandContext,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: LoopDto,
  ): Promise<void> {
    if (!guild) return;
    const mode = dto.mode === 'track' || dto.mode === 'queue' ? dto.mode : 'off';
    this.music.queueOf(guild.id).loop = mode;
    void this.lavalink.repeatLive(guild.id, mode);
    await ctx.reply(`Loop: ${mode}.`);
  }

  @Command({ name: 'search', description: 'Search songs', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  @SameVoice()
  async search(
    @Context() ctx: CommandContext,
    @Guild() guild: DiscordGuild | null,
    @Author() author: User,
    @Options() dto: SearchDto,
  ): Promise<void> {
    if (!guild) return;
    const tracks = (await this.lavalink.search(dto.query, author.id)).slice(0, 5);
    if (!tracks.length) {
      await ctx.reply(t('error.no_result', undefined, this.lang(guild)));
      return;
    }
    const picked = await pickOne(
      ctx,
      tracks.map((track, i) => ({
        label: track.name.slice(0, 100),
        value: String(i),
        description: track.uri.slice(0, 100),
      })),
      {
        content: `Search: ${dto.query}`,
        placeholder: t('search.placeholder', undefined, this.lang(guild)),
        allowedUserId: author.id,
      },
    );
    if (picked === null) return;
    const track = tracks[Number(picked)]!;
    if (
      this.music.queueOf(guild.id).tracks.length >= NON_PREMIUM_QUEUE_CAP &&
      !this.premium.isPremium(guild.id, author.id)
    ) {
      const limited = t('error.premium.limit', undefined, this.lang(guild));
      // ponytail: wrapper reply routes to followUp when already replied (pickOne sent first)
      await ctx.followUp({ content: limited, ephemeral: true });
      return;
    }
    const pos = this.music.enqueue(guild.id, { ...track, requesterId: author.id });
    void this.lavalink.playNow(guild.id, [{ ...track, requesterId: author.id }]);
    const done =
      pos === 0 ? `Now playing: ${trackLine(track)}` : `Queued #${pos}: ${trackLine(track)}`;
    await ctx.followUp({ content: done });
  }

  @Command({ name: 'lyric', description: 'Get lyrics', slash: true, prefix: true })
  @Cooldown(5)
  async lyric(
    @Context() ctx: CommandContext,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: LyricDto,
  ): Promise<void> {
    const fallback = guild ? this.music.queueOf(guild.id).current?.name : null;
    const title = dto.song ?? fallback;
    if (!title) {
      await ctx.reply('Nothing playing. Name a song.');
      return;
    }
    await ctx.reply(t('use_many.searching', undefined, this.lang(guild)));
    const found = await this.lyrics.find(title);
    if (!found || !found.pages.length) {
      await ctx.reply(t('error.no_result', undefined, this.lang(guild)));
      return;
    }
    const pages = found.pages.map((page) =>
      new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setTitle(found.title)
        .setDescription(page.slice(0, 4000))
        .setURL(found.url),
    );
    await paginate(ctx, pages);
  }

  @Button('music:resume')
  async onResume(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    const q = this.music.queueOf(guildId);
    q.paused = !q.paused;
    void this.lavalink.pauseLive(guildId, q.paused);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:skip')
  async onSkip(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    this.music.skip(guildId);
    void this.lavalink.skipLive(guildId);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:stop')
  async onStop(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    this.music.clear(guildId);
    this.music.queueOf(guildId).current = null;
    void this.lavalink.stopLive(guildId);
    await ix.update({ content: 'Stopped.', components: [] });
  }

  @Button('music:loop')
  async onLoop(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    const q = this.music.queueOf(guildId);
    q.loop = q.loop === 'off' ? 'track' : q.loop === 'track' ? 'queue' : 'off';
    void this.lavalink.repeatLive(guildId, q.loop);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:shuffle')
  async onShuffle(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    this.music.shuffle(guildId);
    await ix.reply({ content: 'Shuffled.', ephemeral: true });
  }
}
