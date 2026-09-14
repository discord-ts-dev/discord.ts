import { Injectable, Logger } from '@discord.ts/common';
import { EQList, LavalinkManager, type Player, type Track as LavTrack } from 'lavalink-client';
import type { Client } from 'discord.js';
import type { Track } from './music.service.js';

export interface LiveMirrors {
  onTrackStart(guildId: string, track: Track): void;
  onQueueEnd(guildId: string): void;
}

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
// LAVALINK_SERVER_HOST + PASSWORD; every method is a no-op without it and
// commands fall back to the memory queue. ReadyListener calls attach() with
// the logged-in Client (raw forwarding + init + event mirrors).
@Injectable()
export class LavalinkService {
  private readonly log = new Logger(LavalinkService.name);
  private manager: LavalinkManager | null = null;
  private attached = false;

  get useable(): boolean {
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
      void this.autoplay(player);
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
  async playNow(guildId: string, tracks: Track[], playNext = false): Promise<boolean> {
    const player = this.playerOf(guildId);
    if (!player) return false;
    const raw = tracks.map((t) => t.raw).filter((r): r is LavTrack => !!r);
    if (!raw.length) return false;
    try {
      player.queue.add(playNext ? raw.reverse() : raw, playNext ? 0 : undefined);
      if (!player.playing && !player.paused) await player.play();
      return true;
    } catch (error) {
      this.log.warn(`playNow failed: ${(error as Error).message}`);
      return false;
    }
  }

  async pauseLive(guildId: string, paused: boolean): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    try {
      if (paused) await player.pause();
      else await player.resume();
    } catch {
      // ignore transport errors, memory state already updated
    }
  }

  async skipLive(guildId: string): Promise<void> {
    try {
      await this.playerOf(guildId)?.skip();
    } catch {
      // ignore
    }
  }

  async stopLive(guildId: string): Promise<void> {
    try {
      await this.playerOf(guildId)?.stopPlaying(true, false);
    } catch {
      // ignore
    }
  }

  async seekLive(guildId: string, ms: number): Promise<void> {
    try {
      await this.playerOf(guildId)?.seek(ms);
    } catch {
      // ignore
    }
  }

  async volumeLive(guildId: string, level: number): Promise<void> {
    try {
      await this.playerOf(guildId)?.setVolume(level);
    } catch {
      // ignore
    }
  }

  async repeatLive(guildId: string, mode: 'off' | 'track' | 'queue'): Promise<void> {
    try {
      await this.playerOf(guildId)?.setRepeatMode(mode);
    } catch {
      // ignore
    }
  }

  setAutoplay(guildId: string, on: boolean): void {
    try {
      this.playerOf(guildId)?.set('autoplay', on);
    } catch {
      // ignore
    }
  }

  positionOf(guildId: string): number {
    return this.playerOf(guildId)?.position ?? 0;
  }

  async applyFilter(guildId: string, name: string, enabled: boolean): Promise<void> {
    const player = this.playerOf(guildId);
    if (!player) return;
    try {
      const filters = player.filterManager;
      switch (name) {
        case 'bassboost':
          if (enabled) await filters.setEQ(EQList.BassboostHigh);
          else await filters.clearEQ();
          break;
        case 'nightcore':
          await filters.toggleNightcore(enabled ? 1.25 : undefined);
          break;
        case 'karaoke':
          await filters.toggleKaraoke(enabled ? 1 : undefined);
          break;
        case '8d':
        case 'rotation':
          await filters.toggleRotation(enabled ? 0.2 : undefined);
          break;
        case 'pitch':
          await filters.setPitch(enabled ? 1.2 : 1);
          break;
        case 'speed':
          await filters.setSpeed(enabled ? 1.25 : 1);
          break;
        case 'tremolo':
          await filters.toggleTremolo(enabled ? 4 : undefined);
          break;
        case 'vibrato':
          await filters.toggleVibrato(enabled ? 4 : undefined);
          break;
        case 'lowpass':
          await filters.toggleLowPass(enabled ? 500 : undefined);
          break;
        default:
          break;
      }
    } catch (error) {
      this.log.warn(`Filter ${name} failed: ${(error as Error).message}`);
    }
  }

  async resetFiltersLive(guildId: string): Promise<void> {
    try {
      await this.playerOf(guildId)?.filterManager.resetFilters();
    } catch {
      // ignore
    }
  }

  describeFilter(name: string): string {
    const payloads: Record<string, string> = {
      bassboost: 'EQ bassboost-high',
      nightcore: 'timescale 1.25x',
      karaoke: 'karaoke level 1',
      '8d': 'rotation 0.2Hz',
      pitch: 'pitch 1.2',
      speed: 'speed 1.25x',
      tremolo: 'tremolo 4Hz',
      vibrato: 'vibrato 4Hz',
      lowpass: 'lowpass 500Hz',
      rotation: 'rotation 0.2Hz',
    };
    return payloads[name] ?? name;
  }

  private async autoplay(player: Player): Promise<void> {
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

export const lavalinkService = new LavalinkService();
