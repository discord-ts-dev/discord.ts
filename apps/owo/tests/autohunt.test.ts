import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getBalance } from '@discord.ts/systems';
import {
  AUTOHUNT_INTERVAL_MS,
  AUTOHUNT_PRICE,
  autohuntState,
  buyAutohunt,
  huntsDue,
  runAutohunt,
} from '../src/game/autohunt.js';
import { credit } from '../src/game/economy.js';
import { FileStore } from '../src/game/store.js';
import { setUpgradeLevel } from '../src/game/upgrades.js';
import { getZoo } from '../src/game/zoo.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('huntsDue', () => {
  test('no time, no hunts', () => {
    expect(huntsDue(3, 0, 0)).toBe(0);
    expect(huntsDue(3, 0, AUTOHUNT_INTERVAL_MS - 1)).toBe(0);
  });

  test('one hunt per interval, capped by charges', () => {
    expect(huntsDue(3, 0, AUTOHUNT_INTERVAL_MS)).toBe(1);
    expect(huntsDue(3, 0, AUTOHUNT_INTERVAL_MS * 5)).toBe(3);
  });

  test('no charges, no hunts', () => {
    expect(huntsDue(0, 0, AUTOHUNT_INTERVAL_MS * 10)).toBe(0);
  });
});

describe('autohunt', () => {
  test('buying charges debits and stacks', async () => {
    const store = tempStore();
    await credit(store, '1', AUTOHUNT_PRICE * 3);
    expect(await buyAutohunt(store, '1', 2)).toEqual({ ok: true, charges: 2, bought: 2 });
    expect((await autohuntState(store, '1')).charges).toBe(2);
    expect(await getBalance(store, '1')).toBe(AUTOHUNT_PRICE);
  });

  test('refuses buys without funds', async () => {
    const store = tempStore();
    expect(await buyAutohunt(store, '1', 1)).toEqual({ ok: false, reason: 'insufficient-funds' });
  });

  test('buying at the cap charges only for the room left', async () => {
    const store = tempStore();
    await credit(store, '1', AUTOHUNT_PRICE * 30);
    await buyAutohunt(store, '1', 20);
    expect(await buyAutohunt(store, '1', 10)).toEqual({ ok: true, charges: 24, bought: 4 });
    expect(await getBalance(store, '1')).toBe(AUTOHUNT_PRICE * 6);
    expect(await buyAutohunt(store, '1', 1)).toEqual({ ok: false, reason: 'at-cap' });
  });

  test('buying settles an almost-mature tick instead of resetting it', async () => {
    const store = tempStore();
    await credit(store, '1', AUTOHUNT_PRICE * 5);
    const t0 = Date.now();
    await buyAutohunt(store, '1', 1, t0);
    const result = await buyAutohunt(store, '1', 1, t0 + AUTOHUNT_INTERVAL_MS);
    expect(result).toEqual({ ok: true, charges: 1, bought: 1 });
  });

  test('running consumes due charges and catches animals', async () => {
    const store = tempStore();
    await credit(store, '1', AUTOHUNT_PRICE * 5);
    await buyAutohunt(store, '1', 5);
    const later = Date.now() + AUTOHUNT_INTERVAL_MS * 2;
    const result = await runAutohunt(store, '1', later);
    expect(result.hunts).toBe(2);
    expect((await autohuntState(store, '1')).charges).toBe(3);
    const zoo = await getZoo(store, '1');
    const total = Object.values(zoo).reduce((sum, n) => sum + n, 0);
    expect(total).toBeLessThanOrEqual(2);
  });

  test('the upgrade level raises the autohunt catch chance', async () => {
    const roll = 0.65;
    const base = tempStore();
    await credit(base, '1', AUTOHUNT_PRICE);
    await buyAutohunt(base, '1', 1);
    const missed = await runAutohunt(base, '1', Date.now() + AUTOHUNT_INTERVAL_MS, () => roll);
    expect(missed.caught).toBe(0);

    const upgraded = tempStore();
    await credit(upgraded, '1', AUTOHUNT_PRICE);
    await buyAutohunt(upgraded, '1', 1);
    await setUpgradeLevel(upgraded, '1', 10);
    const caught = await runAutohunt(upgraded, '1', Date.now() + AUTOHUNT_INTERVAL_MS, () => roll);
    expect(caught.caught).toBe(1);
  });

  test('nothing due means nothing happens', async () => {
    const store = tempStore();
    await credit(store, '1', AUTOHUNT_PRICE);
    await buyAutohunt(store, '1', 1);
    const result = await runAutohunt(store, '1', Date.now());
    expect(result.hunts).toBe(0);
    expect((await autohuntState(store, '1')).charges).toBe(1);
  });
});
