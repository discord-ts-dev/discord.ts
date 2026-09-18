import { Injectable, Logger } from '@discord.ts/common';
import { LavalinkManager, type Player, type Track as LavTrack } from 'lavalink-client';
import type { Client } from 'discord.js';
import { applyLiveFilter, describeLiveFilter, resetLiveFilters } from './lavalink-filters.js';
import type { LiveMirrors, PlaybackTransport } from './guild-player.js';
import type { Track } from './track.js';

function nodeOptions(): { host: string; port: number; authorization: string } | null {
  const host = process.env.LAVALINK_SERVER_HOST;
  const port = Number(process.env.LAVALINK_SERVER_PORT ?? 2333);
  const authorization = process.env.LAVALINK_SERVER_PASSWORD ?? '';
  if (!host || !authorization) return null;
  return { host, port, authorization };
}

function toDisplay(raw: LavTrack, requesterId: string): Track {
  return {
    uri: raw.info.uri,
    name: raw.info.title,
    duration: raw.info.isStream ? 0 : (raw.info.duration ?? 0),
    encode: raw.encoded ?? undefined,
    requesterId,
    author: raw.info.author,
    artworkUrl: raw.info.artworkUrl,
    isStream: raw.info.isStream,
    raw,
  };
}

// ponytail: real LavalinkManager transport. Manager exists only with
// LAVALINK_SERVER_HOST + PASSWORD; every method is a no-op without it and the
// Guild player keeps its memory queue. The player calls attach() with the
// logged-in Client (raw forwarding + init + event mirrors).
@Injectable()
export class LavalinkTransport implements PlaybackTransport {
  private readonly log = new Logger(LavalinkTransport.name);
  private manager: LavalinkManager | null = null;
  private attached = false;

  useable(): boolean {
    return this.manager?.useable ?? false;
  }

  available(): boolean {
    return nodeOptions() !== null;
  }

  attach(client: Client, mirrors: LiveMirrors): void {
    if (this.attached) return;
    this.attached = true;
    const node = nodeOptions();
    if (!node) {
      this.log.warn('No Lavalink env, audio transport idle (memory queue only).');
      return;
    }
    this.manager = new LavalinkManager({
      nodes: [{ ...node, id: 'music-bot' }],
      sendToShard: (guildId, payload) => {
        client.guilds.cache.get(guildId)?.shard?.send(payload);
      },
      client: { id: client.user?.id ?? '', username: client.user?.username },
      playerOptions: {
        defaultSearchPlatform: 'ytmsearch',
        onDisconnect: { autoReconnect: true },
        onEmptyQueue: { destroyAfterMs: 180_000 },
      },
      queueOptions: { maxPreviousTracks: 25 },
      autoSkipOnResolveError: true,
      emitNewSongsOnly: true,
    });
    client.on('raw', (packet) => {
      void this.manager?.sendRawData(packet).catch(() => undefined);
    });
    this.manager.on('trackStart', (player, track) => {
      if (track) mirrors.onTrackStart(player.guildId, toDisplay(track, 'unknown'));
    });
    this.manager.on('queueEnd', (player) => {
      mirrors.onQueueEnd(player.guildId);
      void this.autoplayNext(player);
    });
    void this.manager
      .init({ id: client.user?.id ?? '', username: client.user?.username })
      .catch((error: Error) => this.log.warn(`Lavalink init failed: ${error.message}`));
  }

  private playerOf(guildId: string): Player | null {
    try {
      return this.manager?.getPlayer(guildId) ?? null;
    } catch {
      return null;
    }
  }

  async join(guildId: string, voiceChannelId: string, textChannelId: string): Promise<boolean> {
    if (!this.manager) return false;
    try {
      const player = this.manager.createPlayer({
        guildId,
        voiceChannelId,
        textChannelId,
        selfDeaf: true,
      });
      if (!player.connected) await player.connect();
      return true;
    } catch (error) {
      this.log.warn(`Join failed: ${(error as Error).message}`);
      return false;
    }
  }

  async leave(guildId: string): Promise<void> {
    try {
      await this.manager?.destroyPlayer(guildId);
    } catch {
      // already gone
    }
  }

  /** Search via least-used node; raw query passthrough when offline. */
  async search(query: string, requesterId: string): Promise<Track[]> {
    const fallback: Track[] = [{ uri: query, name: query, duration: 0, requesterId }];
    if (!this.manager?.useable) return fallback;
    try {
      const [node] = this.manager.nodeManager.leastUsedNodes('memory');
      if (!node) return fallback;
      const result = await node.search({ query }, { id: requesterId });
      if (result.loadType === 'playlist')
        return result.tracks.map((t) => toDisplay(t, requesterId));
      if (!result.tracks.length) return fallback;
      return result.tracks.slice(0, 5).map((t) => toDisplay(t, requesterId));
    } catch (error) {
      this.log.warn(`Search failed: ${(error as Error).message}`);
      return fallback;
    }
  }

  /** Queue raw tracks on the live player and start it when idle. */
  async play(guildId: string, tracks: Track[], playNext = false): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    const raw = tracks.map((t) => t.raw).filter((r): r is LavTrack => !!r);
    if (!raw.length) return;
    try {
      player.queue.add(playNext ? raw.reverse() : raw, playNext ? 0 : undefined);
      if (!player.playing && !player.paused) await player.play();
    } catch (error) {
      this.log.warn(`play failed: ${(error as Error).message}`);
    }
  }

  async pause(guildId: string, paused: boolean): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    try {
      if (paused) await player.pause();
      else await player.resume();
    } catch {
      // ignore transport errors, memory state already updated
    }
  }

  async skip(guildId: string): Promise<void> {
    try {
      await this.playerOf(guildId)?.skip();
    } catch {
      // ignore
    }
  }

  async stop(guildId: string): Promise<void> {
    try {
      await this.playerOf(guildId)?.stopPlaying(true, false);
    } catch {
      // ignore
    }
  }

  async seek(guildId: string, ms: number): Promise<void> {
    try {
      await this.playerOf(guildId)?.seek(ms);
    } catch {
      // ignore
    }
  }

  async volume(guildId: string, level: number): Promise<void> {
    try {
      await this.playerOf(guildId)?.setVolume(level);
    } catch {
      // ignore
    }
  }

  async repeat(guildId: string, mode: 'off' | 'track' | 'queue'): Promise<void> {
    try {
      await this.playerOf(guildId)?.setRepeatMode(mode);
    } catch {
      // ignore
    }
  }

  autoplay(guildId: string, on: boolean): void {
    try {
      this.playerOf(guildId)?.set('autoplay', on);
    } catch {
      // ignore
    }
  }

  position(guildId: string): number {
    return this.playerOf(guildId)?.position ?? 0;
  }

  async setFilter(guildId: string, name: string, enabled: boolean): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    try {
      await applyLiveFilter(player, name, enabled);
    } catch (error) {
      this.log.warn(`Filter ${name} failed: ${(error as Error).message}`);
    }
  }

  async resetFilters(guildId: string): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    try {
      await resetLiveFilters(player);
    } catch {
      // ignore
    }
  }

  describeFilter(name: string): string {
    return describeLiveFilter(name);
  }

  private async autoplayNext(player: Player): Promise<void> {
    if (!player.get('autoplay')) return;
    try {
      const last = player.queue.previous.at(-1) ?? player.queue.current;
      if (!last) return;
      const seed = `${last.info.author} ${last.info.title} mix`;
      const [node] = this.manager?.nodeManager.leastUsedNodes('memory') ?? [];
      if (!node) return;
      const result = await node.search({ query: seed }, last.requester ?? { id: 'autoplay' });
      const fresh = result.tracks.filter((t) => t.info.uri !== last.info.uri).slice(0, 5);
      if (!fresh.length) return;
      player.queue.add(fresh);
      if (!player.playing) await player.play();
    } catch {
      // autoplay is best-effort
    }
  }
}
