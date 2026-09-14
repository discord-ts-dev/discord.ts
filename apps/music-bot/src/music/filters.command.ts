import { Context, Injectable, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { LavalinkService, lavalinkService } from './lavalink.service.js';
import { MusicService, musicService } from './music.service.js';

const Filters = createCommandGroupDecorator({ name: 'filters', description: 'Audio filters' });

type Ctx = ChatInputCommandInteraction | Message;

function guildIdOf(ctx: Ctx): string | null {
  const guild = 'guild' in ctx ? ctx.guild : null;
  return guild?.id ?? null;
}

@Injectable()
@Filters({ prefix: true })
export class FiltersCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly lavalink: LavalinkService = lavalinkService;

  private async toggle(ctx: Ctx, name: string): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    const q = this.music.queueOf(guildId);
    const i = q.filters.indexOf(name);
    if (i >= 0) q.filters.splice(i, 1);
    else q.filters.push(name);
    const enabled = i < 0;
    void this.lavalink.applyFilter(guildId, name, enabled);
    const payload = this.lavalink.describeFilter(name);
    await ctx.reply(
      `${name}: ${i >= 0 ? 'off' : `on (${payload})`}. Active: ${q.filters.join(', ') || '(off)'}.`,
    );
  }

  @Subcommand({ name: 'bassboost', description: 'Toggle bassboost' })
  @Cooldown(5)
  bassboost(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'bassboost');
  }

  @Subcommand({ name: 'nightcore', description: 'Toggle nightcore' })
  @Cooldown(5)
  nightcore(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'nightcore');
  }

  @Subcommand({ name: 'karaoke', description: 'Toggle karaoke' })
  @Cooldown(5)
  karaoke(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'karaoke');
  }

  @Subcommand({ name: '8d', description: 'Toggle 8d rotation' })
  @Cooldown(5)
  eightD(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, '8d');
  }

  @Subcommand({ name: 'pitch', description: 'Toggle pitch' })
  @Cooldown(5)
  pitch(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'pitch');
  }

  @Subcommand({ name: 'speed', description: 'Toggle speed' })
  @Cooldown(5)
  speed(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'speed');
  }

  @Subcommand({ name: 'tremolo', description: 'Toggle tremolo' })
  @Cooldown(5)
  tremolo(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'tremolo');
  }

  @Subcommand({ name: 'vibrato', description: 'Toggle vibrato' })
  @Cooldown(5)
  vibrato(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'vibrato');
  }

  @Subcommand({ name: 'lowpass', description: 'Toggle lowpass' })
  @Cooldown(5)
  lowpass(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'lowpass');
  }

  @Subcommand({ name: 'rotation', description: 'Toggle rotation' })
  @Cooldown(5)
  rotation(@Context() ctx: Ctx): Promise<void> {
    return this.toggle(ctx, 'rotation');
  }

  @Subcommand({ name: 'reset', description: 'Reset all filters' })
  @Cooldown(5)
  async reset(@Context() ctx: Ctx): Promise<void> {
    const guildId = guildIdOf(ctx);
    if (!guildId) {
      await ctx.reply('Use in a guild.');
      return;
    }
    this.music.queueOf(guildId).filters = [];
    void this.lavalink.resetFiltersLive(guildId);
    await ctx.reply('Filters reset.');
  }
}
