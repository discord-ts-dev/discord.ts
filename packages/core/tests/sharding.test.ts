import assert from 'node:assert/strict';
import { describe, mock, test } from 'bun:test';

const calls: string[] = [];

class FakeManager {
  static last: FakeManager | undefined;
  readonly handlers = new Map<string, Array<(arg: unknown) => void>>();
  readonly spawnCalls: number[] = [];
  constructor(
    readonly file: string,
    readonly options: Record<string, unknown>,
  ) {
    FakeManager.last = this;
  }
  on(event: string, fn: (arg: unknown) => void): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
    return this;
  }
  async spawn(): Promise<this> {
    this.spawnCalls.push(1);
    calls.push('spawn');
    return this;
  }
}

const runtimeCalls: string[] = [];
const realDiscord = await import('discord.js');
mock.module('discord.js', () => ({ ...realDiscord, ShardingManager: FakeManager }));

const fakeCreate = (async () => ({
  discovery: {
    start: async () => void runtimeCalls.push('start'),
    stop: async () => void runtimeCalls.push('stop'),
  },
})) as unknown as typeof createRuntime;

const { bootstrapApp, createShardManager, runShards } = await import('../src/sharding.js');
import type { createRuntime } from '../src/discord.module.js';

describe('createShardManager', () => {
  test('passes options to discord.js and logs shard creation', () => {
    const manager = createShardManager({
      file: './src/main.ts',
      token: 'tok',
    }) as unknown as FakeManager;
    assert.ok(manager instanceof FakeManager);
    assert.equal(manager.file, './src/main.ts');
    assert.deepEqual(manager.options, { token: 'tok', totalShards: 'auto', respawn: true });
    const handler = manager.handlers.get('shardCreate')?.[0];
    assert.ok(handler);
    handler({ id: 3 });
    assert.deepEqual(
      (
        createShardManager({
          file: 'f',
          token: 't',
          totalShards: 2,
          respawn: false,
        }) as unknown as FakeManager
      ).options,
      { token: 't', totalShards: 2, respawn: false },
    );
  });

  test('runShards spawns the manager', async () => {
    calls.length = 0;
    const manager = (await runShards({ file: 'f', token: 't' })) as unknown as FakeManager;
    assert.deepEqual(calls, ['spawn']);
    assert.deepEqual(manager.spawnCalls, [1]);
  });
});

describe('bootstrapApp', () => {
  test('spawns shards when --shards is present', async () => {
    calls.length = 0;
    await bootstrapApp(class App {}, { argv: ['node', 'main.js', '--shards'] });
    assert.deepEqual(calls, ['spawn']);
  });

  test('boots the runtime and wires shutdown handlers otherwise', async () => {
    runtimeCalls.length = 0;
    const before = process.listenerCount('SIGINT');
    await bootstrapApp(class App {}, { argv: ['node', 'main.js'], create: fakeCreate });
    assert.deepEqual(runtimeCalls, ['start']);
    assert.equal(process.listenerCount('SIGINT'), before + 1);
    process.emit('SIGINT' as never);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(runtimeCalls.includes('stop'));
  });
});
