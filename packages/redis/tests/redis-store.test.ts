import { describe, expect, test } from 'bun:test';
import type { ValueProvider } from '@discord.ts/common';
import { STORE } from '@discord.ts/systems';
import { REDIS, RedisStore, redisProviders } from '../src/index.js';
import { FakeRedisClient } from './helpers/fake-client.js';

describe('RedisStore construction', () => {
  test('accepts a url and builds its own client', () => {
    const store = new RedisStore('redis://127.0.0.1:6399');
    expect(store.client).toBeInstanceOf(Bun.RedisClient);
    store.close();
  });

  test('defaults to Bun client resolution', () => {
    const store = new RedisStore();
    expect(store.client).toBeInstanceOf(Bun.RedisClient);
    store.close();
  });

  test('closes a client it built', () => {
    const store = new RedisStore('redis://127.0.0.1:6399');
    let closed = false;
    (store.client as { close: () => void }).close = () => {
      closed = true;
    };
    store.close();
    expect(closed).toBe(true);
  });

  test('accepts a caller-owned client and leaves closing to them', () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    expect(store.client).toBe(client);
    store.close();
    expect(client.closed).toBe(false);
    client.close();
    expect(client.closed).toBe(true);
  });

  test('set with a non-positive ttl deletes the key', async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    await store.set('k', 'v');
    await store.set('k', 'v', 0);
    expect(await store.get('k')).toBeNull();
  });
});

describe('RedisStore serialization', () => {
  test('serializes operations so a MULTI block cannot interleave', async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    await Promise.all([
      store.update(['a'], () => ({ result: 1, writes: { a: 'x' } })),
      store.set('b', 'y', 1000),
    ]);
    const multiAt = client.commands.indexOf('MULTI');
    const execAt = client.commands.indexOf('EXEC');
    expect(multiAt).toBeGreaterThan(-1);
    expect(execAt).toBeGreaterThan(multiAt);
    expect(client.commands.slice(multiAt + 1, execAt)).toEqual(['SET a x KEEPTTL']);
    expect(client.commands.indexOf('SET b y PX 1000')).toBeGreaterThan(execAt);
  });
});

describe('RedisStore update conflicts', () => {
  test('retries when EXEC reports a conflict', async () => {
    const client = new FakeRedisClient();
    client.conflictsToForce = 2;
    const store = new RedisStore({ client });
    const seen: Array<string | null> = [];
    const result = await store.update(['k'], (current) => {
      seen.push(current.k);
      return { result: current.k, writes: { k: 'done' } };
    });
    expect(result).toBeNull();
    expect(seen).toEqual([null, null, null]);
    expect(await store.get('k')).toBe('done');
  });

  test('throws after too many conflicts', async () => {
    const client = new FakeRedisClient();
    client.conflictsToForce = 50;
    const store = new RedisStore({ client });
    await expect(store.update(['k'], () => ({ result: 1 }))).rejects.toThrow('conflicts');
  });

  test('unwatches and keeps serving after fn throws', async () => {
    const client = new FakeRedisClient();
    const store = new RedisStore({ client });
    await expect(
      store.update(['k'], () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(client.commands).toContain('UNWATCH');
    await store.set('k', 'after');
    expect(await store.get('k')).toBe('after');
  });
});

describe('RedisStore client tolerance', () => {
  test('reads members from a plain zrange without scores', async () => {
    const client = new FakeRedisClient();
    await client.zadd('b', 1, 'a');
    await client.zadd('b', 2, 'c');
    expect(await client.zrange('b', 0, -1)).toEqual(['a', 'c']);
    expect(await client.send('MGET', [])).toEqual([]);
  });
});

describe('redisProviders', () => {
  test('registers STORE and REDIS value providers', () => {
    const client = new FakeRedisClient();
    const [storeProvider, redisProvider] = redisProviders({ client }) as [
      ValueProvider,
      ValueProvider,
    ];
    expect(storeProvider.provide).toBe(STORE);
    expect(storeProvider.useValue).toBeInstanceOf(RedisStore);
    expect(redisProvider.provide).toBe(REDIS);
    expect(redisProvider.useValue).toBe(client);
    expect(REDIS).toBe('discord:redis');
  });
});
