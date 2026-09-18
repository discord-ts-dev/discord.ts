// The Store port's shared contract (ADR 0010). Every adapter must pass this
// suite: MemoryStore now, FileStore (#48) and RedisStore next. Test-only; not
// part of any package's published surface.
//
// One rule the suite does not exercise because Redis cannot express it: a key
// holds either a string or a sorted set, never both. MemoryStore keeps the two
// namespaces separate; systems use distinct prefixes and never mix.
import { describe, expect, test } from 'bun:test';
import type { Store } from '@discord.ts/systems';

let namespaceSeq = 0;

export function storeConformance(label: string, create: () => Store): void {
  const ns = `conformance:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${++namespaceSeq}`;
  const key = (name: string): string => `${ns}:${name}`;

  describe(`Store conformance: ${label}`, () => {
    test('get misses and set hits', async () => {
      const store = create();
      const k = key('str');
      expect(await store.get(k)).toBeNull();
      await store.set(k, 'v');
      expect(await store.get(k)).toBe('v');
    });

    test('set without a ttl clears the previous expiry', async () => {
      const store = create();
      const k = key('clear-ttl');
      await store.set(k, 'v', 30);
      await store.set(k, 'v2');
      await Bun.sleep(60);
      expect(await store.get(k)).toBe('v2');
    });

    test('ttl expires lazily, without a sweep timer', async () => {
      const store = create();
      const k = key('ttl');
      await store.set(k, 'v', 30);
      expect(await store.get(k)).toBe('v');
      await Bun.sleep(60);
      expect(await store.get(k)).toBeNull();
    });

    test('del removes string keys', async () => {
      const store = create();
      const k = key('del-string');
      await store.set(k, 'v');
      await store.del(k);
      expect(await store.get(k)).toBeNull();
    });

    test('del removes sorted-set keys', async () => {
      const store = create();
      const k = key('del-zset');
      await store.zadd(k, 1, 'm');
      await store.del(k);
      expect(await store.zscore(k, 'm')).toBeNull();
      expect(await store.zrange(k, 0, -1)).toEqual([]);
    });

    test('incrBy starts from zero, adds and truncates toward zero', async () => {
      const store = create();
      const k = key('count');
      expect(await store.incrBy(k, 3)).toBe(3);
      expect(await store.incrBy(k, -1)).toBe(2);
      expect(await store.incrBy(k, 1.9)).toBe(3);
      expect(await store.get(k)).toBe('3');
    });

    test('incrBy keeps the key ttl', async () => {
      const store = create();
      const k = key('count-ttl');
      await store.set(k, '1', 30);
      expect(await store.incrBy(k, 2)).toBe(3);
      await Bun.sleep(60);
      expect(await store.get(k)).toBeNull();
    });

    test('zadd, zscore, zrank and zrange', async () => {
      const store = create();
      const k = key('board');
      expect(await store.zrange(k, 0, -1)).toEqual([]);
      await store.zadd(k, 10, 'a');
      await store.zadd(k, 30, 'b');
      await store.zadd(k, 20, 'c');
      expect(await store.zscore(k, 'b')).toBe(30);
      expect(await store.zscore(k, 'x')).toBeNull();
      expect(await store.zrank(k, 'a')).toBe(0);
      expect(await store.zrank(k, 'b', true)).toBe(0);
      expect(await store.zrank(k, 'a', true)).toBe(2);
      expect(await store.zrank(k, 'x')).toBeNull();
      expect(await store.zrank(k, 'x', true)).toBeNull();
      expect(await store.zrange(k, 0, -1)).toEqual([
        { member: 'a', score: 10 },
        { member: 'c', score: 20 },
        { member: 'b', score: 30 },
      ]);
      expect(await store.zrange(k, 0, 1, true)).toEqual([
        { member: 'b', score: 30 },
        { member: 'c', score: 20 },
      ]);
      expect(await store.zrange(k, 1, 5)).toEqual([
        { member: 'c', score: 20 },
        { member: 'b', score: 30 },
      ]);
    });

    test('zadd overwrites a member score', async () => {
      const store = create();
      const k = key('overwrite');
      await store.zadd(k, 10, 'a');
      await store.zadd(k, 99, 'a');
      expect(await store.zscore(k, 'a')).toBe(99);
      expect(await store.zrange(k, 0, -1, true)).toEqual([{ member: 'a', score: 99 }]);
    });

    test('equal scores order by member, like Redis', async () => {
      const store = create();
      const k = key('ties');
      await store.zadd(k, 10, 'b');
      await store.zadd(k, 10, 'a');
      expect(await store.zrange(k, 0, -1)).toEqual([
        { member: 'a', score: 10 },
        { member: 'b', score: 10 },
      ]);
      expect(await store.zrange(k, 0, -1, true)).toEqual([
        { member: 'b', score: 10 },
        { member: 'a', score: 10 },
      ]);
      expect(await store.zrank(k, 'a')).toBe(0);
      expect(await store.zrank(k, 'b', true)).toBe(0);
    });

    test('zincrBy starts from zero and adds', async () => {
      const store = create();
      const k = key('zincr');
      expect(await store.zincrBy(k, 5, 'u')).toBe(5);
      expect(await store.zincrBy(k, -2, 'u')).toBe(3);
    });

    test('update reads current values, applies writes and keeps ttls', async () => {
      const store = create();
      const keep = key('update-keep');
      const fresh = key('update-fresh');
      await store.set(keep, '1', 30);
      const out = await store.update([keep, fresh], (current) => {
        expect(current).toEqual({ [keep]: '1', [fresh]: null });
        return { result: 'ok', writes: { [keep]: '2', [fresh]: 'x' } };
      });
      expect(out).toBe('ok');
      expect(await store.get(keep)).toBe('2');
      expect(await store.get(fresh)).toBe('x');
      await Bun.sleep(60);
      expect(await store.get(keep)).toBeNull();
    });

    test('update deletes keys written as null', async () => {
      const store = create();
      const k = key('update-delete');
      await store.set(k, 'y');
      const result = await store.update([k], () => ({ result: true, writes: { [k]: null } }));
      expect(result).toBe(true);
      expect(await store.get(k)).toBeNull();
    });

    test('update applies zadds in the same pass', async () => {
      const store = create();
      const k = key('update-zadd');
      await store.update([], () => ({
        result: undefined,
        zadds: [{ key: k, score: 7, member: 'u' }],
      }));
      expect(await store.zscore(k, 'u')).toBe(7);
    });

    test('update returns the fn result when there is nothing to write', async () => {
      const store = create();
      expect(await store.update([key('noop')], () => ({ result: 42 }))).toBe(42);
    });
  });
}
