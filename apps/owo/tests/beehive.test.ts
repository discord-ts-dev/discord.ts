import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getBalance } from '@discord.ts/systems';
import {
  accruedHoney,
  BEE_PRICE,
  buyBee,
  collectHoney,
  HONEY_CAP_PER_BEE,
  hiveOf,
  HONEY_PER_BEE_PER_HOUR,
  HONEY_PRICE,
  sellHoney,
} from '../src/game/beehive.js';
import { credit } from '../src/game/economy.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

const hour = 3_600_000;

describe('accruedHoney', () => {
  test('no bees means no honey', () => {
    expect(accruedHoney({ bees: 0, honey: 5, at: 0 }, hour)).toBe(5);
  });

  test('accrues per bee per hour', () => {
    const hive = { bees: 2, honey: 0, at: 0 };
    expect(accruedHoney(hive, hour)).toBe(2 * HONEY_PER_BEE_PER_HOUR);
    expect(accruedHoney(hive, hour * 3)).toBe(2 * HONEY_PER_BEE_PER_HOUR * 3);
  });

  test('caps per bee', () => {
    const hive = { bees: 2, honey: 0, at: 0 };
    expect(accruedHoney(hive, hour * 100)).toBe(2 * HONEY_CAP_PER_BEE);
  });
});

describe('hive operations', () => {
  test('buying a bee debits and adds a bee', async () => {
    const store = tempStore();
    await credit(store, '1', BEE_PRICE + 100);
    expect(await buyBee(store, '1')).toEqual({ ok: true, bees: 1 });
    expect(await getBalance(store, '1')).toBe(100);
    expect((await hiveOf(store, '1')).bees).toBe(1);
  });

  test('buying without funds is refused', async () => {
    const store = tempStore();
    expect(await buyBee(store, '1')).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect((await hiveOf(store, '1')).bees).toBe(0);
  });

  test('collect settles accrual once', async () => {
    const store = tempStore();
    await credit(store, '1', BEE_PRICE);
    await buyBee(store, '1');
    const now = Date.now() + hour;
    const first = await collectHoney(store, '1', now);
    expect(first.collected).toBe(HONEY_PER_BEE_PER_HOUR);
    const second = await collectHoney(store, '1', now);
    expect(second.collected).toBe(0);
  });

  test('selling honey credits coins', async () => {
    const store = tempStore();
    await credit(store, '1', BEE_PRICE);
    await buyBee(store, '1');
    await collectHoney(store, '1', Date.now() + hour);
    const result = await sellHoney(store, '1');
    expect(result.collected).toBe(HONEY_PER_BEE_PER_HOUR);
    expect(result.coins).toBe(HONEY_PER_BEE_PER_HOUR * HONEY_PRICE);
    expect(await getBalance(store, '1')).toBe(result.coins);
  });
});
