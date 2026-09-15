import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { deployWithModule } from '../src/deploy.js';
import type { createRuntime } from '../src/discord.module.js';

const calls: unknown[] = [];

function fakeCreate(syncFails = false): typeof createRuntime {
  return (async () => ({
    discovery: {
      buildJson: () => [{ name: 'ping' }, { name: 'pong' }],
      stop: async () => void calls.push('stop'),
    },
    sync: {
      sync: async (body: unknown[]) => {
        calls.push(body);
        if (syncFails) throw new Error('rest down');
      },
    },
  })) as unknown as typeof createRuntime;
}

describe('deployWithModule', () => {
  test('syncs the built JSON and stops discovery', async () => {
    calls.length = 0;
    const result = await deployWithModule(class App {}, fakeCreate());
    assert.deepEqual(result, { count: 2 });
    assert.deepEqual(calls, [[{ name: 'ping' }, { name: 'pong' }], 'stop']);
  });

  test('still stops discovery when the sync fails', async () => {
    calls.length = 0;
    await assert.rejects(deployWithModule(class App {}, fakeCreate(true)), /rest down/);
    assert.deepEqual(calls.at(-1), 'stop');
  });
});
