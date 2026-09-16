import {
  Context,
  Guild,
  Injectable,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { Cooldown, RequireGuild, SameVoice } from '@discord.ts/core';
import type { ChatInputCommandInteraction, Guild as DiscordGuild } from 'discord.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { MusicService, musicService } from './music.service.js';

const Filters = createCommandGroupDecorator({ name: 'filters', description: 'Audio filters' });

@Injectable()
@Filters()
@RequireGuild()
@SameVoice()
export class FiltersCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;

  private async toggle(
    ctx: ChatInputCommandInteraction,
    guild: DiscordGuild,
    name: string,
  ): Promise<void> {
    const q = this.music.queueOf(guild.id);
    const i = q.filters.indexOf(name);
    if (i >= 0) q.filters.splice(i, 1);
    else q.filters.push(name);
    const enabled = i < 0;
    void this.lavalink.applyFilter(guild.id, name, enabled);
    const payload = this.lavalink.describeFilter(name);
    await ctx.reply(
      `${name}: ${i >= 0 ? 'off' : `on (${payload})`}. Active: ${q.filters.join(', ') || '(off)'}.`,
    );
  }

  @Subcommand({ name: 'bassboost', description: 'Toggle bassboost' })
  @Cooldown(5)
  bassboost(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'bassboost');
  }

  @Subcommand({ name: 'nightcore', description: 'Toggle nightcore' })
  @Cooldown(5)
  nightcore(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'nightcore');
  }

  @Subcommand({ name: 'karaoke', description: 'Toggle karaoke' })
  @Cooldown(5)
  karaoke(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'karaoke');
  }

  @Subcommand({ name: '8d', description: 'Toggle 8d rotation' })
  @Cooldown(5)
  eightD(@Context() ctx: ChatInputCommandInteraction, @Guild() guild: DiscordGuild): Promise<void> {
    return this.toggle(ctx, guild, '8d');
  }

  @Subcommand({ name: 'pitch', description: 'Toggle pitch' })
  @Cooldown(5)
  pitch(@Context() ctx: ChatInputCommandInteraction, @Guild() guild: DiscordGuild): Promise<void> {
    return this.toggle(ctx, guild, 'pitch');
  }

  @Subcommand({ name: 'speed', description: 'Toggle speed' })
  @Cooldown(5)
  speed(@Context() ctx: ChatInputCommandInteraction, @Guild() guild: DiscordGuild): Promise<void> {
    return this.toggle(ctx, guild, 'speed');
  }

  @Subcommand({ name: 'tremolo', description: 'Toggle tremolo' })
  @Cooldown(5)
  tremolo(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'tremolo');
  }

  @Subcommand({ name: 'vibrato', description: 'Toggle vibrato' })
  @Cooldown(5)
  vibrato(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'vibrato');
  }

  @Subcommand({ name: 'lowpass', description: 'Toggle lowpass' })
  @Cooldown(5)
  lowpass(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'lowpass');
  }

  @Subcommand({ name: 'rotation', description: 'Toggle rotation' })
  @Cooldown(5)
  rotation(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    return this.toggle(ctx, guild, 'rotation');
  }

  @Subcommand({ name: 'reset', description: 'Reset all filters' })
  @Cooldown(5)
  async reset(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    this.music.queueOf(guild.id).filters = [];
    void this.lavalink.resetFiltersLive(guild.id);
    await ctx.reply('Filters reset.');
  }
}
