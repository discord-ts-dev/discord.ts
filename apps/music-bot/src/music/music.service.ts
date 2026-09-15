import { Injectable } from '@discord.ts/common';
import { db } from './db.js';

// ponytail: one guild = one queue. Memory is the display source of truth;
// LavalinkService plays audio from `raw` originals alongside (see transport
// calls in commands). No service-to-service imports: ReadyListener wires
// event mirrors, commands call both singletons. Framework builds providers
// with `new P()`, so shared state lives in these module singletons.
export interface Track {
  uri: string;
  name: string;
  duration: number;
  encode?: string;
  requesterId?: string;
  author?: string;
  artworkUrl?: string | null;
  isStream?: boolean;
  /** Original lavalink track for transport. Opaque here, cast in LavalinkService. */
  raw?: unknown;
}

export interface GuildQueue {
  tracks: Track[];
  current: Track | null;
  paused: boolean;
  volume: number;
  loop: 'off' | 'track' | 'queue';
  autoplay: boolean;
  filters: string[];
}

const DEFAULT_QUEUE: () => GuildQueue = () => ({
  tracks: [],
  current: null,
  paused: false,
  volume: 100,
  loop: 'off',
  autoplay: false,
  filters: [],
});

@Injectable()
export class MusicService {
  private readonly queues = new Map<string, GuildQueue>();
  private readonly playlists = new Map<
    string,
    { name: string; tracks: Track[]; isPrivate: boolean }[]
  >();

  queueOf(guildId: string): GuildQueue {
    let q = this.queues.get(guildId);
    if (!q) {
      q = DEFAULT_QUEUE();
      this.queues.set(guildId, q);
    }
    return q;
  }

  enqueue(guildId: string, track: Track, playNext = false): number {
    const q = this.queueOf(guildId);
    if (!q.current) {
      q.current = track;
      return 0;
    }
    if (playNext) q.tracks.unshift(track);
    else q.tracks.push(track);
    return q.tracks.length;
  }

  skip(guildId: string): Track | null {
    const q = this.queueOf(guildId);
    q.current = q.tracks.shift() ?? null;
    q.paused = false;
    return q.current;
  }

  clear(guildId: string): void {
    this.queueOf(guildId).tracks = [];
  }

  shuffle(guildId: string): void {
    const q = this.queueOf(guildId);
    for (let i = q.tracks.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.tracks[i], q.tracks[j]] = [q.tracks[j]!, q.tracks[i]!];
    }
  }

  remove(guildId: string, index: number): Track | null {
    const q = this.queueOf(guildId);
    if (index < 1 || index > q.tracks.length) return null;
    return q.tracks.splice(index - 1, 1)[0] ?? null;
  }

  /** Lavalink trackStart mirror: adopt the live track as current. */
  mirrorLiveCurrent(guildId: string, track: Track): void {
    const q = this.queueOf(guildId);
    const at = q.tracks.findIndex((t) => t.uri === track.uri);
    if (at >= 0) q.tracks.splice(at, 1);
    q.current = track;
    q.paused = false;
  }

  /** Lavalink queueEnd mirror: audio drained, keep flags. */
  mirrorQueueEnd(guildId: string): void {
    const q = this.queueOf(guildId);
    q.current = null;
    q.tracks = [];
  }

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

export const musicService = new MusicService();
