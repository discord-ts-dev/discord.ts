import { Injectable } from '@discord.ts/common';
import { db } from './db.js';
import type { Track } from './track.js';

/** User-scoped saved track lists. Guild playback state lives in GuildPlayer. */
@Injectable()
export class PlaylistService {
  private readonly playlists = new Map<
    string,
    { name: string; tracks: Track[]; isPrivate: boolean }[]
  >();

  // --- playlists (memory-first, Prisma write-through + boot hydrate) ---
  async hydratePlaylists(): Promise<void> {
    const client = await db();
    if (!client) return;
    // ponytail: explicit rows, the generated client is absent in CI typecheck.
    interface HydrateTrack {
      uri: string;
      name: string;
      duration: number;
      encode: string;
    }
    interface HydratePlaylist {
      userId: string;
      name: string;
      private: boolean;
      tracks: HydrateTrack[];
    }
    const rows = (await client.playlist
      .findMany({ include: { tracks: true } })
      .catch(() => null)) as HydratePlaylist[] | null;
    if (!rows) return;
    for (const row of rows) {
      const list = this.playlists.get(row.userId) ?? [];
      list.push({
        name: row.name,
        tracks: row.tracks.map((t) => ({
          uri: t.uri,
          name: t.name,
          duration: t.duration,
          encode: t.encode,
        })),
        isPrivate: row.private,
      });
      this.playlists.set(row.userId, list);
    }
  }

  listPlaylists(userId: string): { name: string; size: number }[] {
    return (this.playlists.get(userId) ?? []).map((p) => ({ name: p.name, size: p.tracks.length }));
  }

  createPlaylist(userId: string, name: string): boolean {
    const list = this.playlists.get(userId) ?? [];
    if (list.some((p) => p.name === name)) return false;
    list.push({ name, tracks: [], isPrivate: false });
    this.playlists.set(userId, list);
    void this.persistCreatePlaylist(userId, name);
    return true;
  }

  addToPlaylist(userId: string, name: string, track: Track): boolean {
    const list = this.playlists.get(userId) ?? [];
    const pl = list.find((p) => p.name === name);
    if (!pl) return false;
    pl.tracks.push(track);
    void this.persistAddTrack(userId, name, track);
    return true;
  }

  loadPlaylist(userId: string, name: string): Track[] | null {
    const list = this.playlists.get(userId) ?? [];
    return list.find((p) => p.name === name)?.tracks ?? null;
  }

  deletePlaylist(userId: string, name: string): boolean {
    const list = this.playlists.get(userId) ?? [];
    const next = list.filter((p) => p.name !== name);
    if (next.length === list.length) return false;
    this.playlists.set(userId, next);
    void this.persistDeletePlaylist(userId, name);
    return true;
  }

  private async persistCreatePlaylist(userId: string, name: string): Promise<void> {
    const client = await db();
    if (!client) return;
    await client.user
      .upsert({ where: { userId }, update: {}, create: { userId } })
      .catch(() => null);
    await client.playlist
      .upsert({ where: { userId_name: { userId, name } }, update: {}, create: { userId, name } })
      .catch(() => null);
  }

  private async persistAddTrack(userId: string, name: string, track: Track): Promise<void> {
    const client = await db();
    if (!client) return;
    const pl = await client.playlist
      .findUnique({ where: { userId_name: { userId, name } } })
      .catch(() => null);
    if (!pl) return;
    await client.track
      .create({
        data: {
          uri: track.uri,
          name: track.name,
          duration: Math.round(track.duration),
          encode: track.encode ?? track.uri,
          playlist_id: pl.playlist_id,
        },
      })
      .catch(() => null);
  }

  private async persistDeletePlaylist(userId: string, name: string): Promise<void> {
    const client = await db();
    if (!client) return;
    await client.playlist.delete({ where: { userId_name: { userId, name } } }).catch(() => null);
  }
}
