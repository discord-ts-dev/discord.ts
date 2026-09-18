import { Inject, Injectable } from '@discord.ts/common';
import type { Client } from 'discord.js';
import { LavalinkTransport } from './lavalink-transport.js';
import type { Track } from './track.js';

export interface GuildQueue {
  tracks: Track[];
  current: Track | null;
  paused: boolean;
  volume: number;
  loop: 'off' | 'track' | 'queue';
  autoplay: boolean;
  filters: string[];
}

export interface LiveMirrors {
  onTrackStart(guildId: string, track: Track): void;
  onQueueEnd(guildId: string): void;
}

/**
 * What the Guild player needs from audio transport. Two adapters satisfy it:
 * LavalinkTransport in production, a fake in tests.
 */
export interface PlaybackTransport {
  available(): boolean;
  useable(): boolean;
  attach(client: Client, mirrors: LiveMirrors): void;
  search(query: string, requesterId: string): Promise<Track[]>;
  join(guildId: string, voiceChannelId: string, textChannelId: string): Promise<boolean>;
  leave(guildId: string): Promise<void>;
  play(guildId: string, tracks: Track[], playNext?: boolean): Promise<void>;
  pause(guildId: string, paused: boolean): Promise<void>;
  skip(guildId: string): Promise<void>;
  stop(guildId: string): Promise<void>;
  seek(guildId: string, ms: number): Promise<void>;
  volume(guildId: string, level: number): Promise<void>;
  repeat(guildId: string, mode: 'off' | 'track' | 'queue'): Promise<void>;
  autoplay(guildId: string, on: boolean): void;
  position(guildId: string): number;
  setFilter(guildId: string, name: string, enabled: boolean): Promise<void>;
  resetFilters(guildId: string): Promise<void>;
}

const DEFAULT_QUEUE = (): GuildQueue => ({
  tracks: [],
  current: null,
  paused: false,
  volume: 100,
  loop: 'off',
  autoplay: false,
  filters: [],
});

/**
 * One guild, one player: queue state and its transport calls live together, so
 * a command cannot update one half without the other. Transport events mirror
 * back into the queue via `attach()`.
 */
@Injectable()
export class GuildPlayer {
  private readonly queues = new Map<string, GuildQueue>();

  constructor(@Inject(LavalinkTransport) private readonly transport: PlaybackTransport) {}

  queueOf(guildId: string): GuildQueue {
    let q = this.queues.get(guildId);
    if (!q) {
      q = DEFAULT_QUEUE();
      this.queues.set(guildId, q);
    }
    return q;
  }

  /** Wire transport events into queue state. ReadyListener calls this once. */
  attach(client: Client): void {
    this.transport.attach(client, {
      onTrackStart: (guildId, track) => this.mirrorLiveCurrent(guildId, track),
      onQueueEnd: (guildId) => this.mirrorQueueEnd(guildId),
    });
  }

  available(): boolean {
    return this.transport.available();
  }

  useable(): boolean {
    return this.transport.useable();
  }

  search(query: string, requesterId: string): Promise<Track[]> {
    return this.transport.search(query, requesterId);
  }

  join(guildId: string, voiceChannelId: string, textChannelId: string): Promise<boolean> {
    return this.transport.join(guildId, voiceChannelId, textChannelId);
  }

  async leave(guildId: string): Promise<void> {
    this.clear(guildId);
    this.queueOf(guildId).current = null;
    await this.transport.leave(guildId);
  }

  /** Queue in memory and hand the same tracks to the transport. Returns the first position. */
  play(guildId: string, tracks: Track[], playNext = false): number {
    const first = tracks[0];
    const pos = first ? this.enqueue(guildId, first, playNext) : 0;
    void this.transport.play(guildId, tracks, playNext);
    return pos;
  }

  skip(guildId: string): Track | null {
    const q = this.queueOf(guildId);
    q.current = q.tracks.shift() ?? null;
    q.paused = false;
    void this.transport.skip(guildId);
    return q.current;
  }

  stop(guildId: string): void {
    this.clear(guildId);
    this.queueOf(guildId).current = null;
    void this.transport.stop(guildId);
  }

  setPaused(guildId: string, paused: boolean): void {
    this.queueOf(guildId).paused = paused;
    void this.transport.pause(guildId, paused);
  }

  setVolume(guildId: string, level: number): void {
    this.queueOf(guildId).volume = level;
    void this.transport.volume(guildId, level);
  }

  setLoop(guildId: string, mode: GuildQueue['loop']): void {
    this.queueOf(guildId).loop = mode;
    void this.transport.repeat(guildId, mode);
  }

  setAutoplay(guildId: string, on: boolean): void {
    this.queueOf(guildId).autoplay = on;
    this.transport.autoplay(guildId, on);
  }

  seek(guildId: string, ms: number): void {
    void this.transport.seek(guildId, ms);
  }

  positionOf(guildId: string): number {
    return this.transport.position(guildId);
  }

  /** Toggle one audio filter and apply it. Returns whether it is now on. */
  toggleFilter(guildId: string, name: string): boolean {
    const q = this.queueOf(guildId);
    const i = q.filters.indexOf(name);
    if (i >= 0) q.filters.splice(i, 1);
    else q.filters.push(name);
    const enabled = i < 0;
    void this.transport.setFilter(guildId, name, enabled);
    return enabled;
  }

  resetFilters(guildId: string): void {
    this.queueOf(guildId).filters = [];
    void this.transport.resetFilters(guildId);
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

  /** Transport trackStart mirror: adopt the live track as current. */
  private mirrorLiveCurrent(guildId: string, track: Track): void {
    const q = this.queueOf(guildId);
    const at = q.tracks.findIndex((t) => t.uri === track.uri);
    if (at >= 0) q.tracks.splice(at, 1);
    q.current = track;
    q.paused = false;
  }

  /** Transport queueEnd mirror: audio drained, keep flags. */
  private mirrorQueueEnd(guildId: string): void {
    const q = this.queueOf(guildId);
    q.current = null;
    q.tracks = [];
  }
}
