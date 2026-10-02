// The Store port's shared contract (ADR 0010). Every adapter must pass this
// suite: MemoryStore, FileStore, and RedisStore run it. Test-only; not part
// of any package's published surface.
//
// One rule the suite does not exercise because Redis cannot express it: a key
// holds either a string or a sorted set, never both. MemoryStore keeps the two
// namespaces separate; systems use distinct prefixes and never mix.
import { describe, expect, test } from 'bun:test';
import type { Store } from '@discord-ts-dev/systems';

// TTL tests assert against real wall-clock expiry, so anything that has to read
// a key back before it expires is a race against the runner's scheduling
// jitter. These windows are sized to clear that jitter; keep them well clear of
// the suite's own step times, or a loaded CI box fails a correct adapter.
// Where a test can prove the same contract from the post-expiry state instead,
// it does, because a slow machine only helps that direction.
const TTL = 500;
const PAST_TTL = TTL * 2;

// Names that collide with a property of Object.prototype. A plain object
// resolves them to inherited state instead of stored values, so every adapter
// has to treat them as ordinary keys and members (ADR 0016).
const ADVERSARIAL = ['__proto__', 'constructor', 'prototype'];

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

    // The same names on the key side. `get` has to answer null for a key nobody
    // wrote rather than the value its name happens to inherit, and an increment
    // has to start from what was actually stored under that key.
    for (const name of ADVERSARIAL) {
      test(`an adversarial key (${name}) is an ordinary key`, async () => {
        const store = create();
        expect(await store.get(name)).toBeNull();
        await store.set(name, '4');
        expect(await store.get(name)).toBe('4');
        expect(await store.incrBy(name, 1)).toBe(5);
        await store.del(name);
        expect(await store.get(name)).toBeNull();
      });
    }

    // `incrBy` is not the only path to a stored value: `update` reads through a
    // map it builds from the caller's keys, so an adversarial name has to
    // arrive in `current` as the value that was stored, not as whatever the
    // map inherits.
    for (const name of ADVERSARIAL) {
      test(`update reads an adversarial key (${name}) as its stored value`, async () => {
        const store = create();
        await store.set(name, '4');
        const out = await store.update([name], (current) => ({
          result: current[name],
          writes: { [name]: '5' },
        }));
        expect(out).toBe('4');
        expect(await store.get(name)).toBe('5');
      });
    }

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
      await store.set(k, 'v', TTL);
      expect(await store.get(k)).toBe('v');
      await Bun.sleep(PAST_TTL);
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
      // incrBy has to land inside the window: late, it reads the expired key as
      // absent, starts from zero and rewrites the key with no ttl, which would
      // turn the expiry assertion below into a false failure.
      await store.set(k, '1', TTL);
      expect(await store.incrBy(k, 2)).toBe(3);
      await Bun.sleep(PAST_TTL);
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

    // A member is the one Store parameter no key module closes off (ADR 0016),
    // so it is the one an app can get wrong. These names are what turn an
    // own-property write into a prototype write on a plain object; every
    // adapter has to keep them ordinary members and reach no other object.
    for (const name of ADVERSARIAL) {
      test(`an adversarial member (${name}) is an ordinary member`, async () => {
        const store = create();
        const k = key(`proto-member:${name}`);
        await store.zadd(k, 5, name);
        expect(await store.zscore(k, name)).toBe(5);
        expect(await store.zrange(k, 0, -1)).toEqual([{ member: name, score: 5 }]);
        expect(await store.zincrBy(k, 2, name)).toBe(7);
      });
    }

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

    test('update reads current values and applies writes', async () => {
      const store = create();
      const keep = key('update-keep');
      const fresh = key('update-fresh');
      await store.set(keep, '1');
      const out = await store.update([keep, fresh], (current) => {
        expect(current).toEqual({ [keep]: '1', [fresh]: null });
        return { result: 'ok', writes: { [keep]: '2', [fresh]: 'x' } };
      });
      expect(out).toBe('ok');
      expect(await store.get(keep)).toBe('2');
      expect(await store.get(fresh)).toBe('x');
    });

    test('update keeps the key ttl', async () => {
      const store = create();
      const k = key('update-ttl');
      // The write inherits the key's expiry, so the value is gone once the
      // window passes. Reading it back as '2' first would race the window, and
      // a write that lands after expiry would revive the key with no ttl.
      await store.set(k, '1', TTL);
      await store.update([k], () => ({ result: undefined, writes: { [k]: '2' } }));
      await Bun.sleep(PAST_TTL);
      expect(await store.get(k)).toBeNull();
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
