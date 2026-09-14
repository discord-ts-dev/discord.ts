import { Button, Command, Context, Injectable, Options, StringSelect } from '@discord.ts/common';
import { Cooldown, RequireBotPermissions } from '@discord.ts/core';
import { paginate } from '@discord.ts/ux';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { LoopDto, LyricDto, SearchDto, ToggleDto } from './dto/music.dto.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { LocaleService, localeService } from './locale.service.js';
import { LyricService, lyricService } from './lyric.service.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';
import { formatTime, progressBar } from './format.js';
import {
  NON_PREMIUM_QUEUE_CAP,
  guildIdOf,
  trackLine,
  userIdOf,
  voiceChannelIdOf,
  type Ctx,
} from './music-helpers.js';

@Injectable()
export class MusicHudCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;
  private readonly lyrics: LyricService = lyricService;
  private readonly locale: LocaleService = localeService;
  private readonly premium: PremiumService = premiumService;

  private lang(ctx: Ctx): string {
    return this.premium.languageOf(guildIdOf(ctx));
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
  async nowplaying(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const q = this.music.queueOf(guildId);
    if (!q.current) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.player.no_track_playing'));
      return;
    }
    const total = q.current.duration > 0 ? formatTime(q.current.duration) : 'LIVE';
    const pos = this.lavalink.positionOf(guildId);
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setDescription(
        `[${q.current.name}](${q.current.uri}) - request by <@${q.current.requesterId ?? 'unknown'}>\n\n\`${progressBar(pos, q.current.duration)}\``,
      )
      .addFields({ name: '​', value: `\`${formatTime(pos)} / ${total}\`` });
    await ctx.reply({ embeds: [embed], components: [this.controlRow(guildId)] });
  }

  @Command({ name: 'autoplay', description: 'Toggle autoplay', slash: true, prefix: true })
  @Cooldown(5)
  async autoplay(@Context() ctx: Ctx, @Options() dto: ToggleDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const q = this.music.queueOf(guildId);
    q.autoplay = dto.on ?? !q.autoplay;
    this.lavalink.setAutoplay(guildId, q.autoplay);
    await ctx.reply(`Autoplay: ${q.autoplay ? 'on' : 'off'}.`);
  }

  @Command({ name: 'loop', description: 'Loop track, queue, or off', slash: true, prefix: true })
  @Cooldown(5)
  async loop(@Context() ctx: Ctx, @Options() dto: LoopDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const mode = dto.mode === 'track' || dto.mode === 'queue' ? dto.mode : 'off';
    this.music.queueOf(guildId).loop = mode;
    void this.lavalink.repeatLive(guildId, mode);
    await ctx.reply(`Loop: ${mode}.`);
  }

  @Command({ name: 'search', description: 'Search songs', slash: true, prefix: true })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  async search(@Context() ctx: Ctx, @Options() dto: SearchDto): Promise<void> {
    if (!voiceChannelIdOf(ctx)) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.voice.not_in_voice'));
      return;
    }
    const tracks = (await this.lavalink.search(dto.query, userIdOf(ctx))).slice(0, 5);
    if (!tracks.length) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.no_result'));
      return;
    }
    this.music.rememberSearch(userIdOf(ctx), tracks);
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`music:search:${userIdOf(ctx)}`)
      .setPlaceholder(this.locale.t(this.lang(ctx), 'search.placeholder'))
      .addOptions(
        tracks.map((t, i) => ({
          label: t.name.slice(0, 100),
          value: String(i),
          description: t.uri.slice(0, 100),
        })),
      );
    await ctx.reply({
      content: `Search: ${dto.query}`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });
  }

  @StringSelect(/^music:search:.+/)
  async onSearchPick(@Context() ix: StringSelectMenuInteraction): Promise<void> {
    const ownerId = ix.customId.split(':')[2];
    if (ix.user.id !== ownerId) {
      await ix.reply({ content: 'Not your search.', ephemeral: true });
      return;
    }
    const guildId = ix.guildId;
    if (!guildId) {
      await ix.reply({ content: 'Use in a guild.', ephemeral: true });
      return;
    }
    if (
      this.music.queueOf(guildId).tracks.length >= NON_PREMIUM_QUEUE_CAP &&
      !this.premium.isPremium(guildId, ix.user.id)
    ) {
      await ix.reply({
        content: this.locale.t(this.premium.languageOf(guildId), 'error.premium.limit'),
        ephemeral: true,
      });
      return;
    }
    const track = this.music.takeSearch(ix.user.id, Number(ix.values[0] ?? 0));
    if (!track) {
      await ix.reply({ content: 'Expired. Search again.', ephemeral: true });
      return;
    }
    const pos = this.music.enqueue(guildId, { ...track, requesterId: ix.user.id });
    void this.lavalink.playNow(guildId, [{ ...track, requesterId: ix.user.id }]);
    await ix.update({
      content:
        pos === 0 ? `Now playing: ${trackLine(track)}` : `Queued #${pos}: ${trackLine(track)}`,
      components: [],
    });
  }

  @Command({ name: 'lyric', description: 'Get lyrics', slash: true, prefix: true })
  @Cooldown(5)
  async lyric(@Context() ctx: Ctx, @Options() dto: LyricDto): Promise<void> {
    const guildId = guildIdOf(ctx);
    const fallback = guildId ? this.music.queueOf(guildId).current?.name : null;
    const title = dto.song ?? fallback;
    if (!title) {
      await ctx.reply('Nothing playing. Name a song.');
      return;
    }
    await ctx.reply(this.locale.t(this.lang(ctx), 'use_many.searching'));
    const found = await this.lyrics.find(title);
    if (!found || !found.pages.length) {
      await ctx.reply(this.locale.t(this.lang(ctx), 'error.no_result'));
      return;
    }
    const pages = found.pages.map((page) =>
      new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setTitle(found.title)
        .setDescription(page.slice(0, 4000))
        .setURL(found.url),
    );
    await paginate(ctx as never, pages);
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
