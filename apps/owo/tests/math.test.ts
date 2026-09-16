import { describe, expect, test } from 'bun:test';
import { evaluate } from '../src/game/math.js';

const value = (expr: string) => {
  const result = evaluate(expr);
  expect(result.ok).toBe(true);
  return result.ok ? result.value : NaN;
};

describe('evaluate', () => {
  test('respects precedence and parentheses', () => {
    expect(value('1+2*3')).toBe(7);
    expect(value('(1+2)*3')).toBe(9);
    expect(value('2*(3+4)-5')).toBe(9);
  });

  test('handles unary minus and decimals', () => {
    expect(value('-5 + 2')).toBe(-3);
    expect(value('5/2')).toBe(2.5);
    expect(value('-(2+3)')).toBe(-5);
  });

  test('exponent is right associative, modulo works', () => {
    expect(value('2^3^2')).toBe(512);
    expect(value('10 % 3')).toBe(1);
  });

  test('rejects garbage', () => {
    expect(evaluate('')).toEqual({ ok: false, reason: 'empty' });
    expect(evaluate('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(evaluate('2 +')).toEqual({ ok: false, reason: 'invalid' });
    expect(evaluate('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(evaluate('((1+2)')).toEqual({ ok: false, reason: 'invalid' });
    expect(evaluate('1..2')).toEqual({ ok: false, reason: 'invalid' });
  });

  test('names division by zero', () => {
    expect(evaluate('1/0')).toEqual({ ok: false, reason: 'divide-by-zero' });
    expect(evaluate('5 % 0')).toEqual({ ok: false, reason: 'divide-by-zero' });
  });

  test('caps length', () => {
    expect(evaluate('1+'.repeat(80) + '1')).toEqual({ ok: false, reason: 'too-long' });
  });
});
