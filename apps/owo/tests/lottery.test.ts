import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getBalance } from '@discord.ts/systems';
import { credit } from '../src/game/economy.js';
import { buyTickets, drawLottery, drawWinner, lotteryState } from '../src/game/lottery.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('drawWinner', () => {
  test('returns null for an empty ticket pool', () => {
    expect(drawWinner([])).toBeNull();
    expect(drawWinner([{ userId: 'a', count: 0 }])).toBeNull();
  });

  test('picks the only player', () => {
    expect(drawWinner([{ userId: 'a', count: 1 }], () => 0.5)).toBe('a');
  });

  test('weights the roll by ticket count', () => {
    const tickets = [
      { userId: 'a', count: 1 },
      { userId: 'b', count: 3 },
    ];
    expect(drawWinner(tickets, () => 0)).toBe('a');
    expect(drawWinner(tickets, () => 0.26)).toBe('b');
    expect(drawWinner(tickets, () => 0.999)).toBe('b');
  });
});

describe('buyTickets', () => {
  test('debits the buyer and grows the pot', async () => {
    const store = tempStore();
    await credit(store, '1', 1000);
    const result = await buyTickets(store, '1', 2);
    expect(result.ok).toBe(true);
    expect(await getBalance(store, '1')).toBe(500);
    const state = await lotteryState(store);
    expect(state.pot).toBe(500);
    expect(state.tickets['1']).toBe(2);
  });

  test('refuses buys the balance cannot cover', async () => {
    const store = tempStore();
    await credit(store, '1', 100);
    const result = await buyTickets(store, '1', 1);
    expect(result.ok).toBe(false);
    expect(await getBalance(store, '1')).toBe(100);
    expect((await lotteryState(store)).pot).toBe(0);
  });

  test('refuses nonsense counts', async () => {
    const store = tempStore();
    await credit(store, '1', 1000);
    expect((await buyTickets(store, '1', 0)).ok).toBe(false);
    expect((await buyTickets(store, '1', -3)).ok).toBe(false);
    expect((await buyTickets(store, '1', 1.5)).ok).toBe(false);
  });
});

describe('drawLottery', () => {
  test('pays the whole pot to the winner and resets the round', async () => {
    const store = tempStore();
    await credit(store, '1', 1000);
    await credit(store, '2', 1000);
    await buyTickets(store, '1', 1);
    await buyTickets(store, '2', 3);
    const result = await drawLottery(store, () => 0.999);
    expect(result).toEqual({ winner: '2', pot: 1000 });
    expect(await getBalance(store, '2')).toBe(1250);
    const state = await lotteryState(store);
    expect(state.pot).toBe(0);
    expect(state.tickets).toEqual({});
    expect(state.last).toEqual({ winner: '2', pot: 1000 });
  });

  test('draws nothing when no tickets were sold', async () => {
    const store = tempStore();
    expect(await drawLottery(store)).toBeNull();
  });
});
