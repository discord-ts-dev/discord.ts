import { describe, expect, test } from 'bun:test';
import { MemoryStore } from '../src/index.js';

describe('MemoryStore strings', () => {
  test('get misses, set hits', async () => {
    const s = new MemoryStore();
    expect(await s.get('k')).toBeNull();
    await s.set('k', 'v');
    expect(await s.get('k')).toBe('v');
  });

  test('ttl expires', async () => {
    const s = new MemoryStore();
    await s.set('k', 'v', 20);
    expect(await s.get('k')).toBe('v');
    await Bun.sleep(40);
    expect(await s.get('k')).toBeNull();
  });

  test('incrBy from missing and existing', async () => {
    const s = new MemoryStore();
    expect(await s.incrBy('c', 5)).toBe(5);
    expect(await s.incrBy('c', -2)).toBe(3);
  });

  test('del removes', async () => {
    const s = new MemoryStore();
    await s.set('k', 'v');
    await s.del('k');
    expect(await s.get('k')).toBeNull();
  });
});

describe('MemoryStore sorted sets', () => {
  test('zadd, zscore, zrank, zrange', async () => {
    const s = new MemoryStore();
    await s.zadd('lb', 10, 'a');
    await s.zadd('lb', 30, 'b');
    await s.zadd('lb', 20, 'c');
    expect(await s.zscore('lb', 'b')).toBe(30);
    expect(await s.zscore('lb', 'x')).toBeNull();
    expect(await s.zrank('lb', 'b', true)).toBe(0);
    expect(await s.zrank('lb', 'a', true)).toBe(2);
    expect(await s.zrange('lb', 0, 1, true)).toEqual([
      { member: 'b', score: 30 },
      { member: 'c', score: 20 },
    ]);
    expect(await s.zrange('lb', 0, -1)).toEqual([
      { member: 'a', score: 10 },
      { member: 'c', score: 20 },
      { member: 'b', score: 30 },
    ]);
  });

  test('zadd overwrites member score', async () => {
    const s = new MemoryStore();
    await s.zadd('lb', 10, 'a');
    await s.zadd('lb', 99, 'a');
    expect(await s.zscore('lb', 'a')).toBe(99);
    expect(await s.zrange('lb', 0, -1, true)).toEqual([{ member: 'a', score: 99 }]);
  });
});

describe('MemoryStore atomic updates', () => {
  test('update writes values, deletes nulls and preserves TTL', async () => {
    const s = new MemoryStore();
    await s.set('keep', '1', 40);
    const out = await s.update(['keep', 'fresh'], (current) => {
      expect(current).toEqual({ keep: '1', fresh: null });
      return { result: 'ok' as const, writes: { keep: '2', fresh: 'x' } };
    });
    expect(out).toBe('ok');
    expect(await s.get('keep')).toBe('2');
    expect(await s.get('fresh')).toBe('x');
    await Bun.sleep(60);
    expect(await s.get('keep')).toBeNull();
  });

  test('update deletes a key written as null', async () => {
    const s = new MemoryStore();
    await s.set('gone', 'y');
    const result = await s.update(['gone'], () => ({ result: true, writes: { gone: null } }));
    expect(result).toBe(true);
    expect(await s.get('gone')).toBeNull();
  });

  test('update applies zadds in the same pass', async () => {
    const s = new MemoryStore();
    await s.update([], () => ({
      result: undefined,
      zadds: [{ key: 'lb', score: 7, member: 'u' }],
    }));
    expect(await s.zscore('lb', 'u')).toBe(7);
  });

  test('incrBy keeps the key TTL', async () => {
    const s = new MemoryStore();
    await s.set('c', '1', 40);
    expect(await s.incrBy('c', 2)).toBe(3);
    await Bun.sleep(60);
    expect(await s.get('c')).toBeNull();
  });

  test('zincrBy starts from zero and adds', async () => {
    const s = new MemoryStore();
    expect(await s.zincrBy('lb', 5, 'u')).toBe(5);
    expect(await s.zincrBy('lb', -2, 'u')).toBe(3);
  });
});
