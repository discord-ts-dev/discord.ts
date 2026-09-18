import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { inventory } from '@discord.ts/systems';
import { acceptTrade, getTrade, proposeTrade } from '../src/game/trade.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

async function give(store: FileStore, userId: string, itemId: string, qty: number): Promise<void> {
  await store.set(`inv:${userId}`, JSON.stringify({ [itemId]: qty }));
}

describe('trade', () => {
  test('propose needs the item, then accept swaps it', async () => {
    const store = tempStore();
    await give(store, '1', 'lootbox', 2);
    expect(await proposeTrade(store, 't1', '1', '2', 'lootbox', 1)).toEqual({ ok: true });
    expect((await getTrade(store, 't1'))?.to).toBe('2');
    expect(await acceptTrade(store, 't1', '2')).toEqual({ ok: true });
    expect(await inventory(store, '1')).toEqual({ lootbox: 1 });
    expect(await inventory(store, '2')).toEqual({ lootbox: 1 });
    expect(await getTrade(store, 't1')).toBeNull();
  });

  test('refuses offers for items the proposer does not own', async () => {
    const store = tempStore();
    expect(await proposeTrade(store, 't2', '1', '2', 'lootbox', 1)).toEqual({
      ok: false,
      reason: 'no-item',
    });
  });

  test('only the receiver can accept', async () => {
    const store = tempStore();
    await give(store, '1', 'lootbox', 1);
    await proposeTrade(store, 't3', '1', '2', 'lootbox', 1);
    expect(await acceptTrade(store, 't3', '3')).toEqual({ ok: false, reason: 'not-yours' });
    expect(await inventory(store, '1')).toEqual({ lootbox: 1 });
  });

  test('accept is refused after the proposer spends the item', async () => {
    const store = tempStore();
    await give(store, '1', 'lootbox', 1);
    await proposeTrade(store, 't4', '1', '2', 'lootbox', 1);
    await store.set('inv:1', JSON.stringify({}));
    expect(await acceptTrade(store, 't4', '2')).toEqual({ ok: false, reason: 'no-item' });
    expect(await getTrade(store, 't4')).toBeNull();
  });

  test('expired offers read as gone', async () => {
    const store = tempStore();
    await give(store, '1', 'lootbox', 1);
    await proposeTrade(store, 't5', '1', '2', 'lootbox', 1, 1);
    await Bun.sleep(5);
    expect(await getTrade(store, 't5')).toBeNull();
    expect(await acceptTrade(store, 't5', '2')).toEqual({ ok: false, reason: 'expired' });
  });
});
