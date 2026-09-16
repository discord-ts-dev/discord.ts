import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'bun:test';
import { claimDrop, createDrop, getDrop, resetClaims } from '../src/game/drop.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

beforeEach(() => resetClaims());

describe('drop', () => {
  test('creates a claimable drop', async () => {
    const store = tempStore();
    await createDrop(store, 'chan-1', 500);
    expect(await getDrop(store, 'chan-1')).toMatchObject({ amount: 500 });
  });

  test('exactly one claim wins', async () => {
    const store = tempStore();
    await createDrop(store, 'chan-1', 500);
    expect(await claimDrop(store, 'chan-1')).toEqual({ ok: true, amount: 500 });
    expect(await claimDrop(store, 'chan-1')).toEqual({ ok: false, reason: 'taken' });
    expect(await getDrop(store, 'chan-1')).toBeNull();
  });

  test('two concurrent claims pay once', async () => {
    const store = tempStore();
    await createDrop(store, 'chan-1', 500);
    const [a, b] = await Promise.all([claimDrop(store, 'chan-1'), claimDrop(store, 'chan-1')]);
    const wins = [a, b].filter((r) => r.ok);
    expect(wins).toHaveLength(1);
  });

  test('claiming nothing is gone', async () => {
    const store = tempStore();
    expect(await claimDrop(store, 'chan-1')).toEqual({ ok: false, reason: 'gone' });
  });

  test('expiry closes the drop and a new one reopens the channel', async () => {
    const store = tempStore();
    await createDrop(store, 'chan-1', 100, 1);
    await Bun.sleep(5);
    expect(await claimDrop(store, 'chan-1')).toEqual({ ok: false, reason: 'gone' });
    await createDrop(store, 'chan-1', 200);
    expect(await claimDrop(store, 'chan-1')).toEqual({ ok: true, amount: 200 });
  });
});
