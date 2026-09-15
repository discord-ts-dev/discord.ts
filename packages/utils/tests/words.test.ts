import { describe, expect, test } from 'bun:test';
import { containsBlocked, maskBlocked } from '../src/index.js';

describe('word filter', () => {
  test('word boundaries, case-insensitive', () => {
    expect(containsBlocked('you are bad', ['bad'])).toBe(true);
    expect(containsBlocked('you are BAD', ['bad'])).toBe(true);
    expect(containsBlocked('badminton club', ['bad'])).toBe(false);
    expect(containsBlocked('clean chat', ['bad'])).toBe(false);
  });

  test('mask redacts matches', () => {
    expect(maskBlocked('you are bad, very bad', ['bad'])).toBe('you are ***, very ***');
  });
});
