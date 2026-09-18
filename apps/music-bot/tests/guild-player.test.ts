import { describe, expect, test } from 'bun:test';
import type { Client } from 'discord.js';
import {
  GuildPlayer,
  type GuildQueue,
  type LiveMirrors,
  type PlaybackTransport,
} from '../src/music/guild-player.js';
import type { Track } from '../src/music/track.js';

function track(name: string): Track {
  return { uri: `https://x/${name}`, name, duration: 1000 };
}

class FakeTransport implements PlaybackTransport {
  readonly calls: string[] = [];
  mirrors: LiveMirrors | null = null;

  available(): boolean {
    return true;
  }

  useable(): boolean {
    return true;
  }

  attach(_client: Client, mirrors: LiveMirrors): void {
    this.mirrors = mirrors;
    this.calls.push('attach');
  }

  async search(query: string, requesterId: string): Promise<Track[]> {
    this.calls.push(`search:${query}:${requesterId}`);
    return [track('a'), track('b')];
  }

  async join(guildId: string, voiceChannelId: string, textChannelId: string): Promise<boolean> {
    this.calls.push(`join:${guildId}:${voiceChannelId}:${textChannelId}`);
    return true;
  }

  async leave(guildId: string): Promise<void> {
    this.calls.push(`leave:${guildId}`);
  }

  async play(guildId: string, tracks: Track[], playNext = false): Promise<void> {
    this.calls.push(`play:${guildId}:${tracks.length}:${playNext}`);
  }

  async pause(guildId: string, paused: boolean): Promise<void> {
    this.calls.push(`pause:${guildId}:${paused}`);
  }

  async skip(guildId: string): Promise<void> {
    this.calls.push(`skip:${guildId}`);
  }

  async stop(guildId: string): Promise<void> {
    this.calls.push(`stop:${guildId}`);
  }

  async seek(guildId: string, ms: number): Promise<void> {
    this.calls.push(`seek:${guildId}:${ms}`);
  }

  async volume(guildId: string, level: number): Promise<void> {
    this.calls.push(`volume:${guildId}:${level}`);
  }

  async repeat(guildId: string, mode: GuildQueue['loop']): Promise<void> {
    this.calls.push(`repeat:${guildId}:${mode}`);
  }

  autoplay(guildId: string, on: boolean): void {
    this.calls.push(`autoplay:${guildId}:${on}`);
  }

  position(guildId: string): number {
    this.calls.push(`position:${guildId}`);
    return 42;
  }

  async setFilter(guildId: string, name: string, enabled: boolean): Promise<void> {
    this.calls.push(`filter:${guildId}:${name}:${enabled}`);
  }

  async resetFilters(guildId: string): Promise<void> {
    this.calls.push(`resetFilters:${guildId}`);
  }
}

function setup(): { player: GuildPlayer; transport: FakeTransport } {
  const transport = new FakeTransport();
  return { player: new GuildPlayer(transport), transport };
}

describe('GuildPlayer queue and transport stay in step', () => {
  test('play queues in memory and hands the same tracks to the transport', () => {
    const { player, transport } = setup();
    const [a, b] = [track('a'), track('b')];
    expect(player.play('g', [a, b])).toBe(0);
    expect(player.queueOf('g').current).toBe(a);
    expect(transport.calls).toContain('play:g:2:false');

    const c = track('c');
    expect(player.play('g', [c])).toBe(1);
    expect(player.queueOf('g').tracks).toEqual([c]);

    expect(player.play('g', [])).toBe(0);
    expect(transport.calls).toContain('play:g:0:false');
  });

  test('play next unshifts and skip advances both halves', () => {
    const { player, transport } = setup();
    player.enqueue('g', track('current'));
    const next = track('next');
    player.play('g', [next], true);
    expect(player.queueOf('g').tracks).toEqual([next]);

    expect(player.skip('g')).toBe(next);
    expect(player.queueOf('g').paused).toBe(false);
    expect(transport.calls).toContain('skip:g');

    player.setPaused('g', true);
    expect(player.skip('g')).toBeNull();
  });

  test('stop and leave clear the queue and call the transport', async () => {
    const { player, transport } = setup();
    player.enqueue('g', track('a'));
    player.stop('g');
    expect(player.queueOf('g').current).toBeNull();
    expect(player.queueOf('g').tracks).toEqual([]);
    expect(transport.calls).toContain('stop:g');

    player.enqueue('g', track('b'));
    await player.leave('g');
    expect(player.queueOf('g').tracks).toEqual([]);
    expect(transport.calls).toContain('leave:g');
  });

  test('setters write state and transport together', () => {
    const { player, transport } = setup();
    player.setPaused('g', true);
    player.setVolume('g', 55);
    player.setLoop('g', 'queue');
    player.setAutoplay('g', true);
    player.seek('g', 1234);

    const q = player.queueOf('g');
    expect(q.paused).toBe(true);
    expect(q.volume).toBe(55);
    expect(q.loop).toBe('queue');
    expect(q.autoplay).toBe(true);
    expect(player.positionOf('g')).toBe(42);
    expect(transport.calls).toEqual([
      'pause:g:true',
      'volume:g:55',
      'repeat:g:queue',
      'autoplay:g:true',
      'seek:g:1234',
      'position:g',
    ]);
  });

  test('filters toggle in both directions and reset together', () => {
    const { player, transport } = setup();
    expect(player.toggleFilter('g', 'bassboost')).toBe(true);
    expect(player.queueOf('g').filters).toEqual(['bassboost']);
    expect(player.toggleFilter('g', 'bassboost')).toBe(false);
    expect(player.queueOf('g').filters).toEqual([]);
    player.toggleFilter('g', '8d');
    player.resetFilters('g');
    expect(player.queueOf('g').filters).toEqual([]);
    expect(transport.calls).toEqual([
      'filter:g:bassboost:true',
      'filter:g:bassboost:false',
      'filter:g:8d:true',
      'resetFilters:g',
    ]);
  });

  test('shuffle, remove and clear stay in memory only', () => {
    const { player, transport } = setup();
    player.enqueue('g', track('a'));
    player.enqueue('g', track('b'));
    player.enqueue('g', track('c'));
    player.shuffle('g');
    expect(player.queueOf('g').tracks).toHaveLength(2);
    expect(player.remove('g', 0)).toBeNull();
    expect(player.remove('g', 99)).toBeNull();
    expect(player.remove('g', 1)).not.toBeNull();
    player.clear('g');
    expect(player.queueOf('g').tracks).toEqual([]);
    expect(transport.calls).toEqual([]);
  });

  test('transport mirrors update the queue', () => {
    const { player, transport } = setup();
    player.attach({} as Client);
    expect(transport.calls).toEqual(['attach']);
    expect(transport.mirrors).not.toBeNull();

    const live = track('live');
    player.enqueue('g', track('current'));
    player.enqueue('g', live);
    transport.mirrors?.onTrackStart('g', live);
    expect(player.queueOf('g').current).toBe(live);
    expect(player.queueOf('g').tracks).toEqual([]);
    expect(player.queueOf('g').paused).toBe(false);

    transport.mirrors?.onTrackStart('g', track('unknown'));
    expect(player.queueOf('g').current?.name).toBe('unknown');

    transport.mirrors?.onQueueEnd('g');
    expect(player.queueOf('g').current).toBeNull();
    expect(player.queueOf('g').tracks).toEqual([]);
  });

  test('delegates search, join and capability checks', async () => {
    const { player, transport } = setup();
    expect(player.available()).toBe(true);
    expect(player.useable()).toBe(true);
    expect((await player.search('q', 'u')).map((t) => t.name)).toEqual(['a', 'b']);
    expect(await player.join('g', 'v', 't')).toBe(true);
    expect(transport.calls).toEqual(['search:q:u', 'join:g:v:t']);
  });
});
