import { describe, expect, test } from 'bun:test';
import { parseAmount } from '../src/index.js';

describe('parseAmount', () => {
  test('plain ints and commas', () => {
    expect(parseAmount('100', 1000)).toEqual({ ok: true, value: 100 });
    expect(parseAmount('1,000', 2000)).toEqual({ ok: true, value: 1000 });
  });

  test('all and max mean balance', () => {
    expect(parseAmount('all', 750)).toEqual({ ok: true, value: 750 });
    expect(parseAmount('MAX', 750)).toEqual({ ok: true, value: 750 });
  });

  test('k/m/b suffixes', () => {
    expect(parseAmount('2k', 9000)).toEqual({ ok: true, value: 2000 });
    expect(parseAmount('1.5m', 9_000_000)).toEqual({ ok: true, value: 1_500_000 });
    expect(parseAmount('3b', 9_000_000_000)).toEqual({ ok: true, value: 3_000_000_000 });
  });

  test('invalid, non-positive, over balance', () => {
    expect(parseAmount('abc', 100)).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('0', 100)).toEqual({ ok: false, reason: 'non-positive' });
    expect(parseAmount('-5', 100)).toEqual({ ok: false, reason: 'non-positive' });
    expect(parseAmount('200', 100)).toEqual({ ok: false, reason: 'exceeds-balance' });
    expect(parseAmount('all', 0)).toEqual({ ok: false, reason: 'non-positive' });
    expect(parseAmount('all', -5)).toEqual({ ok: false, reason: 'non-positive' });
  });
});
