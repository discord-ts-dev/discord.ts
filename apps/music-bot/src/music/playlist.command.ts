import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { PlaylistAddDto, PlaylistNameDto, PlaylistStealDto } from './dto/music.dto.js';
import { LocaleService, localeService } from './locale.service.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';

type Ctx = ChatInputCommandInteraction | Message;

function userIdOf(ctx: Ctx): string {
  if ('author' in ctx) return ctx.author.id;
  return ctx.user.id;
}

async function reply(ctx: Ctx, text: string): Promise<void> {
  await ctx.reply(text.slice(0, 2000));
}

@Injectable()
export class PlaylistCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly premium: PremiumService = premiumService;
  private readonly locale: LocaleService = localeService;

  @Command({ name: 'playlist', description: 'List your playlists', slash: true, prefix: true })
  @Cooldown(5)
  async list(@Context() ctx: Ctx): Promise<void> {
    const list = this.music.listPlaylists(userIdOf(ctx));
    await reply(
      ctx,
      list.length ? list.map((p) => `${p.name} (${p.size})`).join('\n') : 'No playlists.',
    );
  }

  @Command({ name: 'playlist-create', description: 'Create a playlist', slash: true, prefix: true })
  @Cooldown(5)
  async create(@Context() ctx: Ctx, @Options() dto: PlaylistNameDto): Promise<void> {
    const lang = this.premium.languageOf('guild' in ctx ? (ctx.guild?.id ?? null) : null);
    const ok = this.music.createPlaylist(userIdOf(ctx), dto.name);
    await reply(
      ctx,
      ok ? this.locale.t(lang, 'success.playlist.create', { name: dto.name }) : 'Name taken.',
    );
  }

  @Command({
    name: 'playlist-add',
    description: 'Add a song to a playlist',
    slash: true,
    prefix: true,
  })
  @Cooldown(5)
  async add(@Context() ctx: Ctx, @Options() dto: PlaylistAddDto): Promise<void> {
    const ok = this.music.addToPlaylist(userIdOf(ctx), dto.name, {
      uri: dto.song,
      name: dto.song,
      duration: 0,
      requesterId: userIdOf(ctx),
    });
    await reply(ctx, ok ? `Added to ${dto.name}.` : 'Playlist not found.');
  }

  @Command({
    name: 'playlist-load',
    description: 'Load a playlist into queue',
    slash: true,
    prefix: true,
  })
  @Cooldown(5)
  async load(@Context() ctx: Ctx, @Options() dto: PlaylistNameDto): Promise<void> {
    const tracks = this.music.loadPlaylist(userIdOf(ctx), dto.name);
    await reply(ctx, tracks ? `Loaded ${dto.name} (${tracks.length}).` : 'Playlist not found.');
  }

  @Command({ name: 'playlist-delete', description: 'Delete a playlist', slash: true, prefix: true })
  @Cooldown(5)
  async remove(@Context() ctx: Ctx, @Options() dto: PlaylistNameDto): Promise<void> {
    const ok = this.music.deletePlaylist(userIdOf(ctx), dto.name);
    await reply(ctx, ok ? `Deleted ${dto.name}.` : 'Playlist not found.');
  }

  @Command({
    name: 'playlist-remove',
    description: 'Remove a song from a playlist',
    slash: true,
    prefix: true,
  })
  @Cooldown(5)
  async removeSong(@Context() ctx: Ctx, @Options() dto: PlaylistAddDto): Promise<void> {
    // ponytail: index-based removesong plugs into the Prisma Track delete here.
    await reply(ctx, `Removesong in ${dto.name}: match by position in queue with /remove for now.`);
  }

  @Command({
    name: 'playlist-steal',
    description: "Copy another user's playlist",
    slash: true,
    prefix: true,
  })
  @Cooldown(5)
  async steal(@Context() ctx: Ctx, @Options() dto: PlaylistStealDto): Promise<void> {
    const from = dto.user.replace(/[<@!>]/g, '');
    const tracks = this.music.loadPlaylist(from, dto.name);
    if (!tracks) {
      await reply(ctx, 'Playlist not found or private.');
      return;
    }
    if (!this.music.createPlaylist(userIdOf(ctx), dto.name)) {
      await reply(ctx, 'You already have that name.');
      return;
    }
    for (const track of tracks) this.music.addToPlaylist(userIdOf(ctx), dto.name, track);
    await reply(ctx, `Stole ${dto.name} (${tracks.length}).`);
  }
}
