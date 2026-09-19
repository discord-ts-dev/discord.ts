import { afterAll, describe, expect, test } from 'bun:test';
import { RedisStore } from '../src/index.js';
import { storeConformance } from '../../../tests/store-conformance.js';

const url = process.env.REDIS_URL;
const suite = url ? describe : describe.skip;

// Runs with env REDIS_URL set; CI provides a redis service. Skipped locally
// when no server is configured, which is why the fake-client suite exists.
suite('RedisStore against a real Redis', () => {
  const store = new RedisStore(url);
  storeConformance('RedisStore (real Redis)', () => store);

  test('two stores contend without losing updates', async () => {
    const other = new RedisStore(url);
    const key = `conformance:contention:${Date.now()}`;
    const bump = (target: RedisStore): Promise<string> =>
      target.update([key], (current) => {
        const next = String(Number(current[key] ?? 0) + 1);
        return { result: next, writes: { [key]: next } };
      });
    try {
      await store.set(key, '0');
      await Promise.all([
        ...Array.from({ length: 25 }, () => bump(store)),
        ...Array.from({ length: 25 }, () => bump(other)),
      ]);
      expect(await store.get(key)).toBe('50');
      await store.del(key);
    } finally {
      other.close();
    }
  });

  afterAll(() => {
    store.close();
  });
});
