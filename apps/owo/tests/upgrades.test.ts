import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { RARITIES } from '../src/game/roster.js';
import {
  huntChance,
  sacrificeXp,
  setUpgradeLevel,
  upgradeCost,
  upgradeLevel,
  UPGRADE_MAX_LEVEL,
} from '../src/game/upgrades.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('upgradeCost', () => {
  test('grows with the level and never goes down', () => {
    expect(upgradeCost(0)).toBe(1000);
    expect(upgradeCost(1)).toBe(4000);
    expect(upgradeCost(2)).toBe(9000);
    for (let level = 1; level < UPGRADE_MAX_LEVEL; level++) {
      expect(upgradeCost(level)).toBeGreaterThan(upgradeCost(level - 1));
    }
  });
});

describe('huntChance', () => {
  test('adds one point per level and caps at 90%', () => {
    expect(huntChance(0.6, 0)).toBe(0.6);
    expect(huntChance(0.6, 5)).toBe(0.65);
    expect(huntChance(0.6, UPGRADE_MAX_LEVEL)).toBeLessThanOrEqual(0.9);
    expect(huntChance(0.85, UPGRADE_MAX_LEVEL)).toBe(0.9);
  });
});

describe('sacrificeXp', () => {
  test('trades an animal for xp, rarer is worth more', () => {
    expect(sacrificeXp('common')).toBe(RARITIES.common.sellPrice / 10);
    expect(sacrificeXp('legendary')).toBe(RARITIES.legendary.sellPrice / 10);
    expect(sacrificeXp('legendary')).toBeGreaterThan(sacrificeXp('common'));
  });
});

describe('upgrade level storage', () => {
  test('defaults to 0 and round-trips', async () => {
    const store = tempStore();
    expect(await upgradeLevel(store, '1')).toBe(0);
    await setUpgradeLevel(store, '1', 3);
    expect(await upgradeLevel(store, '1')).toBe(3);
    await setUpgradeLevel(store, '1', 0);
    expect(await upgradeLevel(store, '1')).toBe(0);
  });
});
