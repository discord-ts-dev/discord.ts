import {
  Author,
  Button,
  Command,
  Context,
  Guild,
  Inject,
  Injectable,
  Options,
} from '@discord.ts/common';
import { Cooldown, RequireBotPermissions, RequireGuild, SameVoice } from '@discord.ts/core';
import { t } from '@discord.ts/i18n';
import { deliver, paginate, pickOne, replyEphemeral } from '@discord.ts/ux';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type User,
} from 'discord.js';
import { LoopDto, LyricDto, SearchDto, ToggleDto } from './dto/music.dto.js';
import { GuildPlayer } from './guild-player.js';
import { LyricService } from './lyric.service.js';
import { PremiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';
import { formatTime, progressBar } from '@discord.ts/utils';
import { NON_PREMIUM_QUEUE_CAP, trackLine } from './music-helpers.js';

@Injectable()
@RequireGuild()
export class MusicHudCommand {
  constructor(
    @Inject(GuildPlayer) private readonly player: GuildPlayer,
    @Inject(LyricService) private readonly lyrics: LyricService,
    @Inject(PremiumService) private readonly premium: PremiumService,
  ) {}

  private lang(guild: DiscordGuild): string {
    return this.premium.languageOf(guild.id);
  }

  private controlRow(guildId: string): ActionRowBuilder<ButtonBuilder> {
    const q = this.player.queueOf(guildId);
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

  @Command({ name: 'nowplaying', description: 'Show current track', category: 'Music' })
  @Cooldown(5)
  async nowplaying(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    const q = this.player.queueOf(guild.id);
    if (!q.current) {
      await ctx.reply(t('error.player.no_track_playing', undefined, this.lang(guild)));
      return;
    }
    const total = q.current.duration > 0 ? formatTime(q.current.duration) : 'LIVE';
    const pos = this.player.positionOf(guild.id);
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setDescription(
        `[${q.current.name}](${q.current.uri}) - request by <@${q.current.requesterId ?? 'unknown'}>\n\n\`${progressBar(pos, q.current.duration)}\``,
      )
      .addFields({ name: '​', value: `\`${formatTime(pos)} / ${total}\`` });
    await ctx.reply({ embeds: [embed], components: [this.controlRow(guild.id)] });
  }

  @Command({ name: 'autoplay', description: 'Toggle autoplay', category: 'Music' })
  @Cooldown(5)
  async autoplay(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    const q = this.player.queueOf(guild.id);
    const next = dto.on ?? !q.autoplay;
    this.player.setAutoplay(guild.id, next);
    await ctx.reply(`Autoplay: ${next ? 'on' : 'off'}.`);
  }

  @Command({ name: 'loop', description: 'Loop track, queue, or off', category: 'Music' })
  @Cooldown(5)
  async loop(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Options() dto: LoopDto,
  ): Promise<void> {
    const mode = dto.mode === 'track' || dto.mode === 'queue' ? dto.mode : 'off';
    this.player.setLoop(guild.id, mode);
    await ctx.reply(`Loop: ${mode}.`);
  }

  @Command({ name: 'search', description: 'Search songs', category: 'Music' })
  @Cooldown(5)
  @RequireBotPermissions(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak)
  @SameVoice()
  async search(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Author() author: User,
    @Options() dto: SearchDto,
  ): Promise<void> {
    const tracks = (await this.player.search(dto.query, author.id)).slice(0, 5);
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
      this.player.queueOf(guild.id).tracks.length >= NON_PREMIUM_QUEUE_CAP &&
      !this.premium.isPremium(guild.id, author.id)
    ) {
      const limited = t('error.premium.limit', undefined, this.lang(guild));
      await replyEphemeral(ctx, limited);
      return;
    }
    const pos = this.player.play(guild.id, [{ ...track, requesterId: author.id }]);
    const done =
      pos === 0 ? `Now playing: ${trackLine(track)}` : `Queued #${pos}: ${trackLine(track)}`;
    await ctx.followUp({ content: done });
  }

  @Command({ name: 'lyric', description: 'Get lyrics', category: 'Music' })
  @Cooldown(5)
  async lyric(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Options() dto: LyricDto,
  ): Promise<void> {
    const fallback = this.player.queueOf(guild.id).current?.name;
    const title = dto.song ?? fallback;
    if (!title) {
      await ctx.reply('Nothing playing. Name a song.');
      return;
    }
    await ctx.reply(t('use_many.searching', undefined, this.lang(guild)));
    const found = await this.lyrics.find(title);
    if (!found || !found.pages.length) {
      await deliver(ctx, { content: t('error.no_result', undefined, this.lang(guild)) });
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
    const guildId = ix.guildId!;
    const q = this.player.queueOf(guildId);
    this.player.setPaused(guildId, !q.paused);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:skip')
  async onSkip(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId!;
    this.player.skip(guildId);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:stop')
  async onStop(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId!;
    this.player.stop(guildId);
    await ix.update({ content: 'Stopped.', components: [] });
  }

  @Button('music:loop')
  async onLoop(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId!;
    const q = this.player.queueOf(guildId);
    const mode = q.loop === 'off' ? 'track' : q.loop === 'track' ? 'queue' : 'off';
    this.player.setLoop(guildId, mode);
    await ix.update({ components: [this.controlRow(guildId)] });
  }

  @Button('music:shuffle')
  async onShuffle(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.guildId!;
    this.player.shuffle(guildId);
    await replyEphemeral(ix, 'Shuffled.');
  }
}
