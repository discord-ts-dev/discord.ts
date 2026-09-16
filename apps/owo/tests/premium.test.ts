import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  dailyMultiplier,
  premiumTierOf,
  setPremiumTier,
  shopPrice,
  TIER_PERKS,
  TIERS,
} from '../src/game/premium.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('premium', () => {
  test('defaults to free and stores a tier', async () => {
    const store = tempStore();
    expect(await premiumTierOf(store, '1')).toBe('free');
    await setPremiumTier(store, '1', 'patron');
    expect(await premiumTierOf(store, '1')).toBe('patron');
    await setPremiumTier(store, '1', 'free');
    expect(await premiumTierOf(store, '1')).toBe('free');
  });

  test('every tier has a perk list, only free is empty', () => {
    for (const tier of TIERS) expect(Array.isArray(TIER_PERKS[tier])).toBe(true);
    expect(TIER_PERKS.free).toHaveLength(0);
    for (const tier of TIERS.filter((t) => t !== 'free')) {
      expect(TIER_PERKS[tier].length).toBeGreaterThan(0);
    }
  });

  test('daily multiplier doubles for paying tiers', () => {
    expect(dailyMultiplier('free')).toBe(1);
    expect(dailyMultiplier('supporter')).toBe(2);
    expect(dailyMultiplier('patron')).toBe(2);
  });

  test('patron pays 10% less, everyone else full price, never below 1', () => {
    expect(shopPrice(1000, 'free')).toBe(1000);
    expect(shopPrice(1000, 'supporter')).toBe(1000);
    expect(shopPrice(1000, 'patron')).toBe(900);
    expect(shopPrice(1, 'patron')).toBe(1);
  });
});
