import { Author, Command, Context, Guild, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireGuild } from '@discord.ts/core';
import { t } from '@discord.ts/i18n';
import type { ChatInputCommandInteraction, Guild as DiscordGuild, User } from 'discord.js';
import { PlaylistAddDto, PlaylistNameDto, PlaylistStealDto } from './dto/music.dto.js';
import { MusicService, musicService } from './music.service.js';
import { PremiumService, premiumService } from './premium.service.js';

async function reply(ctx: ChatInputCommandInteraction, text: string): Promise<void> {
  await ctx.reply(text.slice(0, 2000));
}

@Injectable()
@RequireGuild()
export class PlaylistCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly music: MusicService = musicService;
  private readonly premium: PremiumService = premiumService;

  @Command({ name: 'playlist', description: 'List your playlists' })
  @Cooldown(5)
  async list(@Context() ctx: ChatInputCommandInteraction, @Author() author: User): Promise<void> {
    const list = this.music.listPlaylists(author.id);
    await reply(
      ctx,
      list.length ? list.map((p) => `${p.name} (${p.size})`).join('\n') : 'No playlists.',
    );
  }

  @Command({ name: 'playlist-create', description: 'Create a playlist' })
  @Cooldown(5)
  async create(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Author() author: User,
    @Options() dto: PlaylistNameDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild.id);
    const ok = this.music.createPlaylist(author.id, dto.name);
    await reply(ctx, ok ? t('success.playlist.create', { name: dto.name }, lang) : 'Name taken.');
  }

  @Command({
    name: 'playlist-add',
    description: 'Add a song to a playlist',
  })
  @Cooldown(5)
  async add(
    @Context() ctx: ChatInputCommandInteraction,
    @Author() author: User,
    @Options() dto: PlaylistAddDto,
  ): Promise<void> {
    const ok = this.music.addToPlaylist(author.id, dto.name, {
      uri: dto.song,
      name: dto.song,
      duration: 0,
      requesterId: author.id,
    });
    await reply(ctx, ok ? `Added to ${dto.name}.` : 'Playlist not found.');
  }

  @Command({
    name: 'playlist-load',
    description: 'Load a playlist into queue',
  })
  @Cooldown(5)
  async load(
    @Context() ctx: ChatInputCommandInteraction,
    @Author() author: User,
    @Options() dto: PlaylistNameDto,
  ): Promise<void> {
    const tracks = this.music.loadPlaylist(author.id, dto.name);
    await reply(ctx, tracks ? `Loaded ${dto.name} (${tracks.length}).` : 'Playlist not found.');
  }

  @Command({ name: 'playlist-delete', description: 'Delete a playlist' })
  @Cooldown(5)
  async remove(
    @Context() ctx: ChatInputCommandInteraction,
    @Author() author: User,
    @Options() dto: PlaylistNameDto,
  ): Promise<void> {
    const ok = this.music.deletePlaylist(author.id, dto.name);
    await reply(ctx, ok ? `Deleted ${dto.name}.` : 'Playlist not found.');
  }

  @Command({
    name: 'playlist-remove',
    description: 'Remove a song from a playlist',
  })
  @Cooldown(5)
  async removeSong(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: PlaylistAddDto,
  ): Promise<void> {
    // ponytail: index-based removesong plugs into the Prisma Track delete here.
    await reply(ctx, `Removesong in ${dto.name}: match by position in queue with /remove for now.`);
  }

  @Command({
    name: 'playlist-steal',
    description: "Copy another user's playlist",
  })
  @Cooldown(5)
  async steal(
    @Context() ctx: ChatInputCommandInteraction,
    @Author() author: User,
    @Options() dto: PlaylistStealDto,
  ): Promise<void> {
    const from = dto.user.replace(/[<@!>]/g, '');
    const tracks = this.music.loadPlaylist(from, dto.name);
    if (!tracks) {
      await reply(ctx, 'Playlist not found or private.');
      return;
    }
    if (!this.music.createPlaylist(author.id, dto.name)) {
      await reply(ctx, 'You already have that name.');
      return;
    }
    for (const track of tracks) this.music.addToPlaylist(author.id, dto.name, track);
    await reply(ctx, `Stole ${dto.name} (${tracks.length}).`);
  }
}
