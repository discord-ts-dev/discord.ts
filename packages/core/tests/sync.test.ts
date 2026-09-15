import assert from 'node:assert/strict';
import { describe, mock, test } from 'bun:test';

const puts: Array<{ route: string; body: unknown }> = [];

class FakeREST {
  token = '';
  setToken(token: string): this {
    this.token = token;
    return this;
  }
  async put(route: string, opts: { body: unknown }): Promise<void> {
    puts.push({ route, body: opts.body });
  }
}

const real = await import('discord.js');
mock.module('discord.js', () => ({ ...real, REST: FakeREST }));

const { DiscordSyncService } = await import('../src/discovery/discord-sync.service.js');

describe('DiscordSyncService', () => {
  test('PUTs global commands without development guilds', async () => {
    puts.length = 0;
    await new DiscordSyncService({ token: 'tok', clientId: 'cid', intents: [] }).sync([
      { name: 'ping' },
    ]);
    assert.deepEqual(puts, [{ route: '/applications/cid/commands', body: [{ name: 'ping' }] }]);
  });

  test('PUTs per guild and resolves when all finish', async () => {
    puts.length = 0;
    await new DiscordSyncService({
      token: 'tok',
      clientId: 'cid',
      intents: [],
      development: ['g1', 'g2'],
    }).sync([]);
    assert.deepEqual(
      puts.map((p) => p.route),
      ['/applications/cid/guilds/g1/commands', '/applications/cid/guilds/g2/commands'],
    );
  });

  test('propagates a failed PUT', async () => {
    const failing = new DiscordSyncService({ token: 'tok', clientId: 'cid', intents: [] });
    const original = FakeREST.prototype.put;
    FakeREST.prototype.put = async () => {
      throw new Error('nope');
    };
    try {
      await assert.rejects(failing.sync([]), /nope/);
    } finally {
      FakeREST.prototype.put = original;
    }
  });
});
