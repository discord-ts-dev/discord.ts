import { describe, expect, test } from 'bun:test';
import { RARITIES, ROSTER } from '../src/game/roster.js';
import {
  applyMove,
  battleReward,
  fighterFor,
  moveResult,
  RARITY_STATS,
  WEAPONS,
  type BattleState,
  type Fighter,
} from '../src/game/battle.js';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] as number;
};

const wolf = ROSTER.find((a) => a.id === 'wolf')!;
const rat = ROSTER.find((a) => a.id === 'rat')!;
const trident = WEAPONS.find((w) => w.id === 'trident')!;
const dagger = WEAPONS.find((w) => w.id === 'dagger')!;
const hammer = WEAPONS.find((w) => w.id === 'hammer')!;

describe('tables', () => {
  test('weapons have unique ids, positive stats, and at least one effect', () => {
    const ids = WEAPONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const weapon of WEAPONS) {
      expect(weapon.price).toBeGreaterThan(0);
      expect(weapon.atk).toBeGreaterThan(0);
      expect(weapon.name.length).toBeGreaterThan(0);
    }
    expect(WEAPONS.some((w) => w.effect)).toBe(true);
  });

  test('every rarity has stats and higher tiers are stronger', () => {
    const tiers = Object.keys(RARITIES);
    for (const rarity of tiers) {
      const stats = RARITY_STATS[rarity as keyof typeof RARITY_STATS];
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.atk).toBeGreaterThan(0);
      expect(stats.def).toBeGreaterThanOrEqual(0);
    }
    expect(RARITY_STATS.legendary.hp).toBeGreaterThan(RARITY_STATS.common.hp);
    expect(RARITY_STATS.legendary.atk).toBeGreaterThan(RARITY_STATS.common.atk);
  });
});

describe('fighterFor', () => {
  test('builds a fighter from the animal rarity, weapon adds attack', () => {
    const bare = fighterFor('1', wolf);
    expect(bare).toMatchObject({
      userId: '1',
      animalId: 'wolf',
      hp: RARITY_STATS.rare.hp,
      maxHp: RARITY_STATS.rare.hp,
    });
    const armed = fighterFor('1', wolf, trident);
    expect(armed.atk).toBe(RARITY_STATS.rare.atk + trident.atk);
    expect(armed.weaponId).toBe('trident');
  });
});

describe('moveResult', () => {
  const base = (weapon?: typeof trident): Fighter => fighterFor('1', wolf, weapon);

  test('defend deals nothing and guards', () => {
    const result = moveResult(base(), base(), 'defend', () => 0.5);
    expect(result).toEqual({ damage: 0, crit: false, heal: 0, stun: false, guard: true });
  });

  test('attack rolls damage from attack minus defense', () => {
    const attacker = base();
    const defender = base();
    const low = moveResult(attacker, defender, 'attack', seq(0, 0.9));
    const high = moveResult(attacker, defender, 'attack', seq(1, 0.9));
    expect(low.damage).toBe(Math.max(1, Math.floor(attacker.atk * 0.8) - defender.def));
    expect(high.damage).toBe(Math.floor(attacker.atk * 1.2) - defender.def);
    expect(low.crit).toBe(false);
  });

  test('attack crits on a low second roll', () => {
    const attacker = base();
    const result = moveResult(attacker, attacker, 'attack', seq(0.5, 0.01));
    expect(result.crit).toBe(true);
    expect(result.damage).toBe(Math.floor((attacker.atk - attacker.def) * 1.5));
  });

  test('a guard halves incoming damage, rounding down but never to zero', () => {
    const attacker = base();
    const defender = { ...base(), guard: true };
    const unguarded = moveResult(attacker, base(), 'attack', seq(1, 0.9));
    const guarded = moveResult(attacker, defender, 'attack', seq(1, 0.9));
    expect(guarded.damage).toBe(Math.max(1, Math.floor(unguarded.damage / 2)));
  });

  test('weapon specials: lifesteal heals, stun stuns, crit hits harder', () => {
    const heal = moveResult(base(trident), base(), 'special', seq(0.5, 0.9));
    expect(heal.damage).toBeGreaterThan(0);
    expect(heal.heal).toBe(Math.floor(heal.damage * 0.3));

    const stun = moveResult(base(hammer), base(), 'special', seq(0.5, 0.01));
    expect(stun.stun).toBe(true);

    const crit = moveResult(base(dagger), base(), 'special', seq(0.5, 0.01));
    expect(crit.crit).toBe(true);
  });

  test('special with no weapon falls back to a plain attack', () => {
    const plain = moveResult(base(), base(), 'attack', seq(0.5, 0.9));
    const special = moveResult(base(), base(), 'special', seq(0.5, 0.9));
    expect(special).toEqual(plain);
  });
});

describe('battleReward', () => {
  test('winner takes the bet and xp, loser gets xp only', () => {
    expect(battleReward(1000, true)).toEqual({ coins: 1000, xp: 25 });
    expect(battleReward(1000, false)).toEqual({ coins: 0, xp: 10 });
  });
});

describe('applyMove', () => {
  const state = (overrides: Partial<BattleState> = {}): BattleState => ({
    id: 'c_1_2',
    a: fighterFor('1', wolf, trident),
    b: fighterFor('2', rat),
    turn: 'a',
    bet: 100,
    log: [],
    ...overrides,
  });

  test('an attack damages the other side and passes the turn', () => {
    const before = state();
    const { state: next, finished } = applyMove(before, 'a', 'attack', seq(1, 0.9));
    const rolled = Math.floor(before.a.atk * 1.2 - before.b.def);
    expect(next.b.hp).toBe(before.b.hp - rolled);
    expect(next.a.hp).toBe(before.a.hp);
    expect(next.turn).toBe('b');
    expect(finished).toBeNull();
  });

  test('defend guards without damage and passes the turn', () => {
    const { state: next } = applyMove(state(), 'a', 'defend', () => 0.5);
    expect(next.a.guard).toBe(true);
    expect(next.b.hp).toBe(state().b.hp);
    expect(next.turn).toBe('b');
  });

  test('a guard is consumed by the hit it absorbed', () => {
    const guarded = state({ b: { ...fighterFor('2', rat), guard: true } });
    const { state: next } = applyMove(guarded, 'a', 'attack', seq(1, 0.9));
    expect(next.b.guard).toBe(false);
    const full = Math.floor(guarded.a.atk * 1.2 - guarded.b.def);
    expect(next.b.hp).toBe(guarded.b.hp - Math.max(1, Math.floor(full / 2)));
  });

  test('a stun keeps the turn', () => {
    const stunned = state({
      a: fighterFor(
        '1',
        wolf,
        WEAPONS.find((w) => w.id === 'hammer'),
      ),
    });
    const { state: next, event } = applyMove(stunned, 'a', 'special', seq(0.5, 0.9, 0.01));
    expect(event.stun).toBe(true);
    expect(next.turn).toBe('a');
  });

  test('dropping the other side to zero ends the battle', () => {
    const near = state({ b: { ...fighterFor('2', rat), hp: 1 } });
    const { finished, state: next } = applyMove(near, 'a', 'attack', seq(1, 0.9));
    expect(finished).toBe('a');
    expect(next.b.hp).toBe(0);
  });

  test('lifesteal heals the attacker up to the cap', () => {
    const hurt = state({ a: { ...fighterFor('1', wolf, trident), hp: 1 } });
    const { state: next, event } = applyMove(hurt, 'a', 'special', seq(0.5, 0.9));
    expect(event.heal).toBeGreaterThan(0);
    expect(next.a.hp).toBe(Math.min(hurt.a.maxHp, 1 + event.heal));
  });
});
