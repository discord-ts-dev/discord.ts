import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { RARITIES, ROSTER, animalById, type Rarity } from '../src/game/roster.js';
import {
  flip,
  levelFromXp,
  pickAnimal,
  pickRarity,
  rollCatch,
  xpForLevel,
  xpToNext,
} from '../src/game/rng.js';
import { FileStore } from '../src/game/store.js';
import { addAnimal, getZoo, setZoo, zooTotals } from '../src/game/zoo.js';

describe('roster', () => {
  test('has unique ids and every rarity is populated', () => {
    const ids = ROSTER.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rarity of Object.keys(RARITIES) as Rarity[]) {
      expect(ROSTER.some((a) => a.rarity === rarity)).toBe(true);
    }
    for (const animal of ROSTER) {
      expect(animal.name.length).toBeGreaterThan(0);
      expect(animal.emoji.length).toBeGreaterThan(0);
    }
  });

  test('animalById round-trips', () => {
    for (const animal of ROSTER) expect(animalById(animal.id)).toBe(animal);
    expect(animalById('nope')).toBeUndefined();
  });
});

describe('rng', () => {
  test('rollCatch respects the chance boundary', () => {
    expect(rollCatch(0.6, () => 0.59)).toBe(true);
    expect(rollCatch(0.6, () => 0.6)).toBe(false);
  });

  test('pickRarity follows the weight table edges', () => {
    expect(pickRarity(() => 0)).toBe('common');
    expect(pickRarity(() => 0.999)).toBe('legendary');
  });

  test('pickAnimal stays inside the roster and can reach every rarity', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(pickAnimal().id);
    expect([...seen].every((id) => ROSTER.some((a) => a.id === id))).toBe(true);
    expect(seen.has(ROSTER[0]!.id)).toBe(true);
  });

  test('flip splits at the midpoint', () => {
    expect(flip(() => 0.49)).toBe('heads');
    expect(flip(() => 0.5)).toBe('tails');
  });
});

describe('levels', () => {
  test('levelFromXp inverts xpForLevel', () => {
    expect(levelFromXp(0)).toBe(1);
    for (const level of [2, 3, 5, 10]) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  test('xpToNext reports progress inside the current level', () => {
    expect(xpToNext(0)).toEqual({ level: 1, into: 0, need: 50 });
    expect(xpToNext(60)).toEqual({ level: 2, into: 10, need: 150 });
  });
});

describe('zoo', () => {
  test('zooTotals counts animals and species', () => {
    expect(zooTotals({ rat: 2, frog: 0, fox: 3 })).toEqual({ total: 5, unique: 2 });
    expect(zooTotals({})).toEqual({ total: 0, unique: 0 });
  });

  test('addAnimal stacks counts and keeps the zoo board in step', async () => {
    const store = new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
    expect(await addAnimal(store, '1', 'rat')).toBe(1);
    expect(await addAnimal(store, '1', 'rat', 2)).toBe(3);
    expect(await addAnimal(store, '1', 'fox')).toBe(1);
    expect(await getZoo(store, '1')).toEqual({ rat: 3, fox: 1 });
    expect(await store.zscore('lb:zoo', '1')).toBe(4);
  });

  test('setZoo replaces the whole collection and rescoring drops sold animals', async () => {
    const store = new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
    await addAnimal(store, '1', 'rat', 5);
    await setZoo(store, '1', { rat: 2 });
    expect(await getZoo(store, '1')).toEqual({ rat: 2 });
    expect(await store.zscore('lb:zoo', '1')).toBe(2);
  });
});

describe('FileStore', () => {
  function tempStore(): FileStore {
    return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
  }

  test('round-trips strings and numbers', async () => {
    const store = tempStore();
    expect(await store.get('missing')).toBeNull();
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
    await store.set('k', 'v2');
    expect(await store.get('k')).toBe('v2');
    expect(await store.incrBy('n', 5)).toBe(5);
    expect(await store.incrBy('n', -2)).toBe(3);
  });

  test('expires keys lazily', async () => {
    const store = tempStore();
    await store.set('gone', 'x', 1);
    await Bun.sleep(5);
    expect(await store.get('gone')).toBeNull();
    await store.set('holds', 'x', 60_000);
    expect(await store.get('holds')).toBe('x');
  });

  test('survives a new instance on the same file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json');
    const first = new FileStore(file);
    await first.set('bal:1', '42');
    await first.zadd('lb:xp', 10, '1');
    const reopened = new FileStore(file);
    expect(await reopened.get('bal:1')).toBe('42');
    expect(await reopened.zscore('lb:xp', '1')).toBe(10);
  });

  test('sorted sets rank and slice', async () => {
    const store = tempStore();
    await store.zadd('lb:xp', 10, 'a');
    await store.zadd('lb:xp', 30, 'b');
    await store.zadd('lb:xp', 20, 'c');
    expect(await store.zrange('lb:xp', 0, -1, true)).toEqual([
      { member: 'b', score: 30 },
      { member: 'c', score: 20 },
      { member: 'a', score: 10 },
    ]);
    expect(await store.zrange('lb:xp', 0, 0, true)).toEqual([{ member: 'b', score: 30 }]);
    expect(await store.zrank('lb:xp', 'a', true)).toBe(2);
    expect(await store.zrank('lb:xp', 'nope', true)).toBeNull();
    await store.del('lb:xp');
    expect(await store.zscore('lb:xp', 'b')).toBeNull();
  });
});
