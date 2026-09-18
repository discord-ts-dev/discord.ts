import { describe, expect, test } from 'bun:test';
import { SLOT_SYMBOLS, slotMultiplier, spinSlot } from '../src/game/slots.js';

describe('slotMultiplier', () => {
  test('pays the symbol multiplier for a triple', () => {
    expect(slotMultiplier(['seven', 'seven', 'seven'])).toBe(100);
    expect(slotMultiplier(['cherry', 'cherry', 'cherry'])).toBe(5);
    expect(slotMultiplier(['diamond', 'diamond', 'diamond'])).toBe(25);
  });

  test('pays the pair multiplier only when the first two match', () => {
    expect(slotMultiplier(['diamond', 'diamond', 'cherry'])).toBe(3);
    expect(slotMultiplier(['cherry', 'lemon', 'lemon'])).toBe(0);
  });

  test('pays nothing for mixed reels or unknown symbols', () => {
    expect(slotMultiplier(['cherry', 'lemon', 'bell'])).toBe(0);
    expect(slotMultiplier(['nope', 'nope', 'nope'])).toBe(0);
  });
});

describe('spinSlot', () => {
  test('returns three symbols from the table', () => {
    const reels = spinSlot();
    expect(reels).toHaveLength(3);
    for (const symbol of reels) expect(SLOT_SYMBOLS.map((s) => s.id)).toContain(symbol.id);
  });

  test('respects the weighted roll edges', () => {
    expect(spinSlot(() => 0).map((s) => s.id)).toEqual(['cherry', 'cherry', 'cherry']);
    expect(spinSlot(() => 0.999).map((s) => s.id)).toEqual(['seven', 'seven', 'seven']);
  });
});

describe('slot payout table', () => {
  test('a triple always beats a pair on every symbol', () => {
    for (const symbol of SLOT_SYMBOLS) {
      expect(symbol.three).toBeGreaterThan(symbol.two);
      expect(symbol.two).toBeGreaterThanOrEqual(1);
    }
  });

  test('the expected multiplier stays under one, so the machine earns', () => {
    const total = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    const p = new Map(SLOT_SYMBOLS.map((s) => [s.id, s.weight / total]));
    let ev = 0;
    for (const a of SLOT_SYMBOLS) {
      for (const b of SLOT_SYMBOLS) {
        for (const c of SLOT_SYMBOLS) {
          ev +=
            (p.get(a.id) as number) *
            (p.get(b.id) as number) *
            (p.get(c.id) as number) *
            slotMultiplier([a.id, b.id, c.id]);
        }
      }
    }
    expect(ev).toBeLessThan(1);
  });
});
