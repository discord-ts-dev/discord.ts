import { describe, expect, test } from 'bun:test';
import { weightedPick } from '../src/index.js';

describe('weightedPick', () => {
  test('draws the only entry without an injected source', () => {
    expect(weightedPick([{ value: 'x', weight: 1 }])).toBe('x');
  });

  test('weights the draw by share of the total', () => {
    const items = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 3 },
    ];
    expect(weightedPick(items, () => 0)).toBe('a');
    expect(weightedPick(items, () => 0.26)).toBe('b');
    expect(weightedPick(items, () => 0.999)).toBe('b');
  });

  test('skips non-positive weights', () => {
    const items = [
      { value: 'a', weight: 0 },
      { value: 'b', weight: -5 },
      { value: 'c', weight: 1 },
    ];
    expect(weightedPick(items, () => 0.5)).toBe('c');
  });

  test('returns undefined for an empty list', () => {
    expect(weightedPick([], () => 0.5)).toBeUndefined();
  });

  test('returns undefined when no weight is positive', () => {
    const items = [
      { value: 'a', weight: 0 },
      { value: 'b', weight: 0 },
    ];
    expect(weightedPick(items, () => 0.5)).toBeUndefined();
  });

  test('leaves the input untouched', () => {
    const items = [
      { value: 'a', weight: 2 },
      { value: 'b', weight: 1 },
    ];
    const before = JSON.stringify(items);
    expect(weightedPick(items, () => 0.5)).toBe('a');
    expect(JSON.stringify(items)).toBe(before);
  });
});
