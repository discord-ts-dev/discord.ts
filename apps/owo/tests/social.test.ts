import { describe, expect, test } from 'bun:test';
import { EIGHTBALL_ANSWERS, eightball, owoify, shipPercent } from '../src/game/social.js';

describe('owoify', () => {
  test('turns r and l into w, keeping case', () => {
    expect(owoify('hello world')).toBe('hewwo wowwd');
    expect(owoify('Really?')).toBe('Weawwy?');
    expect(owoify('LEMON')).toBe('WEMON');
  });

  test('leaves text without r or l alone', () => {
    expect(owoify('uwu 123')).toBe('uwu 123');
  });
});

describe('eightball', () => {
  test('has non-empty answers and picks by roll', () => {
    expect(EIGHTBALL_ANSWERS.length).toBeGreaterThan(0);
    for (const answer of EIGHTBALL_ANSWERS) expect(answer.length).toBeGreaterThan(0);
    expect(eightball(() => 0)).toBe(EIGHTBALL_ANSWERS[0]);
    expect(eightball(() => 0.999)).toBe(EIGHTBALL_ANSWERS[EIGHTBALL_ANSWERS.length - 1]);
  });
});

describe('shipPercent', () => {
  test('is symmetric and lands in 0..100', () => {
    const ab = shipPercent('111', '222');
    expect(ab).toBe(shipPercent('222', '111'));
    for (const [a, b] of [
      ['1', '2'],
      ['999', '1'],
      ['1', '1'],
      ['a'.repeat(40), 'b'],
    ] as const) {
      const value = shipPercent(a, b);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  test('is stable for the same pair', () => {
    expect(shipPercent('111', '222')).toBe(shipPercent('111', '222'));
  });
});
