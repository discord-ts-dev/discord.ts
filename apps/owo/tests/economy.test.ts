import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { addScore, getBalance } from '@discord.ts/systems';
import { credit, sellCount, WEALTH_BOARD } from '../src/game/economy.js';
import { RARITIES } from '../src/game/roster.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('sellCount', () => {
  test('pays the rarity price per animal sold', () => {
    expect(sellCount({ rat: 3 }, 'rat', 2)).toEqual({
      sold: 2,
      proceeds: 2 * RARITIES.common.sellPrice,
    });
    expect(sellCount({ dragon: 1 }, 'dragon', 1)).toEqual({
      sold: 1,
      proceeds: RARITIES.legendary.sellPrice,
    });
  });

  test('clamps to what the zoo holds', () => {
    expect(sellCount({ rat: 3 }, 'rat', 10)).toEqual({
      sold: 3,
      proceeds: 3 * RARITIES.common.sellPrice,
    });
  });

  test('refuses unknown animals, empty zoos, and non-positive counts', () => {
    expect(sellCount({}, 'rat', 1)).toEqual({ sold: 0, proceeds: 0 });
    expect(sellCount({ rat: 1 }, 'nope', 1)).toEqual({ sold: 0, proceeds: 0 });
    expect(sellCount({ rat: 1 }, 'rat', 0)).toEqual({ sold: 0, proceeds: 0 });
    expect(sellCount({ rat: 1 }, 'rat', -5)).toEqual({ sold: 0, proceeds: 0 });
  });
});

describe('credit', () => {
  test('moves the balance and mirrors it on the wealth board', async () => {
    const store = tempStore();
    expect(await credit(store, '1', 500)).toBe(500);
    expect(await credit(store, '1', -200)).toBe(300);
    expect(await getBalance(store, '1')).toBe(300);
    expect(await addScore(store, WEALTH_BOARD, '1', 0)).toBe(300);
  });
});
