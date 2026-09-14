import { describe, expect, test } from 'bun:test';
import {
  MemoryStore,
  buildHelp,
  containsBlocked,
  getSettings,
  isCommandEnabled,
  maskBlocked,
  parseAmount,
  parseVotePayload,
  setCommandEnabled,
  setPrefix,
} from '../src/index.js';

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

describe('help', () => {
  test('groups by category, uncategorized last', () => {
    const sections = buildHelp([
      { name: 'hunt', description: 'Hunt animals', category: 'Animals' },
      { name: 'ping', description: 'Pong' },
      { name: 'battle', description: 'Fight', category: 'Animals' },
    ]);
    expect(sections.map((s) => s.category)).toEqual(['Animals', 'General']);
    expect(sections[0]?.commands.map((c) => c.name)).toEqual(['battle', 'hunt']);
  });
});

describe('guild settings', () => {
  test('defaults, prefix, toggles', async () => {
    const s = new MemoryStore();
    expect(await getSettings(s, 'g')).toEqual({});
    await setPrefix(s, 'g', '!');
    expect((await getSettings(s, 'g')).prefix).toBe('!');
    expect(await isCommandEnabled(s, 'g', 'Hunt')).toBe(true);
    await setCommandEnabled(s, 'g', 'hunt', false);
    expect(await isCommandEnabled(s, 'g', 'HUNT')).toBe(false);
    await setCommandEnabled(s, 'g', 'hunt', true);
    expect(await isCommandEnabled(s, 'g', 'hunt')).toBe(true);
  });
});

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

describe('parseVotePayload', () => {
  test('top.gg shape', () => {
    expect(parseVotePayload({ user: '123', type: 'upvote' })).toBe('123');
    expect(parseVotePayload({})).toBeNull();
    expect(parseVotePayload(null)).toBeNull();
    expect(parseVotePayload('junk')).toBeNull();
  });
});
