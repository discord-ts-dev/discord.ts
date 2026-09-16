import { describe, expect, test } from 'bun:test';
import { EMOTES, emoteById } from '../src/game/emotes.js';

describe('emotes', () => {
  test('has unique ids, emoji, and text', () => {
    const ids = EMOTES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const emote of EMOTES) {
      expect(emote.emoji.length).toBeGreaterThan(0);
      expect(emote.verb.length).toBeGreaterThan(0);
    }
  });

  test('mixes targeted and untargeted emotes', () => {
    expect(EMOTES.some((e) => e.target)).toBe(true);
    expect(EMOTES.some((e) => !e.target)).toBe(true);
  });

  test('emoteById round-trips', () => {
    for (const emote of EMOTES) expect(emoteById(emote.id)).toBe(emote);
    expect(emoteById('nope')).toBeUndefined();
  });
});
