import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getBalance } from '@discord.ts/systems';
import {
  battleIndex,
  BATTLE_TTL_MS,
  expiredEntries,
  indexBattle,
  refundExpired,
  unindexBattle,
} from '../src/game/battles.js';
import { credit } from '../src/game/economy.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('expiredEntries', () => {
  test('splits by age at the ttl', () => {
    const now = 1_000_000;
    const entries = [
      { id: 'old', players: ['1', '2'] as [string, string], bet: 100, at: now - BATTLE_TTL_MS - 1 },
      { id: 'fresh', players: ['3', '4'] as [string, string], bet: 200, at: now - 5 },
    ];
    expect(expiredEntries(entries, now, BATTLE_TTL_MS).map((e) => e.id)).toEqual(['old']);
    expect(expiredEntries([], now, BATTLE_TTL_MS)).toEqual([]);
  });
});

describe('refundExpired', () => {
  test('refunds both stakes and clears the index entry', async () => {
    const store = tempStore();
    await credit(store, '1', 1000);
    await credit(store, '2', 1000);
    await credit(store, '1', -300);
    await credit(store, '2', -300);
    await indexBattle(store, {
      id: 'b1',
      players: ['1', '2'],
      bet: 300,
      at: Date.now() - BATTLE_TTL_MS - 1,
    });
    const refunded = await refundExpired(store);
    expect(refunded).toBe(1);
    expect(await getBalance(store, '1')).toBe(1000);
    expect(await getBalance(store, '2')).toBe(1000);
    expect(await battleIndex(store)).toEqual([]);
  });

  test('leaves fresh battles alone and only unindexes on settle', async () => {
    const store = tempStore();
    await credit(store, '1', 1000);
    await credit(store, '2', 1000);
    await indexBattle(store, { id: 'b2', players: ['1', '2'], bet: 300, at: Date.now() });
    expect(await refundExpired(store)).toBe(0);
    expect(await battleIndex(store)).toHaveLength(1);
    await unindexBattle(store, 'b2');
    expect(await battleIndex(store)).toEqual([]);
  });

  test('re-indexing the same battle replaces, not duplicates', async () => {
    const store = tempStore();
    const entry = { id: 'b3', players: ['1', '2'] as [string, string], bet: 100, at: Date.now() };
    await indexBattle(store, entry);
    await indexBattle(store, { ...entry, bet: 200 });
    const index = await battleIndex(store);
    expect(index).toHaveLength(1);
    expect(index[0]?.bet).toBe(200);
  });
});
