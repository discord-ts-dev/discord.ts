import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  dueGiveaways,
  enterGiveaway,
  giveawayOf,
  pickWinners,
  setDrawHandler,
  startGiveaway,
  sweepGiveaways,
} from '../src/game/giveaway.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('pickWinners', () => {
  test('returns unique entrants, capped by the pool', () => {
    const entrants = ['a', 'b', 'c'];
    const winners = pickWinners(entrants, 2, () => 0);
    expect(new Set(winners).size).toBe(2);
    expect(entrants).toContain(winners[0]);
    expect(pickWinners(entrants, 10)).toHaveLength(3);
    expect(pickWinners([], 1)).toEqual([]);
  });
});

describe('giveaway flow', () => {
  const base = {
    id: 'g1',
    prize: 'a stick',
    winners: 1,
    hostId: '9',
    channelId: 'chan',
  };

  test('start, enter, and refuse double entries', async () => {
    const store = tempStore();
    await startGiveaway(store, { ...base, endsAt: Date.now() + 60_000 });
    expect((await giveawayOf(store, 'g1'))?.prize).toBe('a stick');
    expect(await enterGiveaway(store, 'g1', '1')).toEqual({ ok: true, entries: 1 });
    expect(await enterGiveaway(store, 'g1', '1')).toEqual({ ok: false, reason: 'already' });
    expect(await enterGiveaway(store, 'g1', '2')).toEqual({ ok: true, entries: 2 });
  });

  test('entering an unknown or ended giveaway fails', async () => {
    const store = tempStore();
    expect(await enterGiveaway(store, 'nope', '1')).toEqual({ ok: false, reason: 'expired' });
    await startGiveaway(store, { ...base, endsAt: Date.now() - 1 });
    expect(await enterGiveaway(store, 'g1', '1')).toEqual({ ok: false, reason: 'expired' });
  });

  test('the sweep draws due giveaways, announces, and clears them', async () => {
    const store = tempStore();
    await startGiveaway(store, { ...base, endsAt: Date.now() + 60_000 });
    await enterGiveaway(store, 'g1', '1');
    await enterGiveaway(store, 'g1', '2');
    const live = await giveawayOf(store, 'g1');
    // Same giveaway, now past its deadline.
    await startGiveaway(store, { ...(live as NonNullable<typeof live>), endsAt: Date.now() - 1 });

    const draws: Array<{ prize: string; entries: number; winners: string[] }> = [];
    setDrawHandler((_giveaway, draw) => {
      draws.push({ prize: draw.prize, entries: draw.entries, winners: draw.winners });
    });

    expect((await dueGiveaways(store)).map((g) => g.id)).toEqual(['g1']);
    const results = await sweepGiveaways(store);
    expect(results).toHaveLength(1);
    expect(draws).toHaveLength(1);
    expect(draws[0]?.prize).toBe('a stick');
    expect(draws[0]?.entries).toBe(2);
    expect(draws[0]?.winners).toHaveLength(1);
    expect(await dueGiveaways(store)).toEqual([]);
    expect(await giveawayOf(store, 'g1')).toBeNull();
  });
});
