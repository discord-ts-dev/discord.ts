import { describe, expect, test } from 'bun:test';
import { renderMeme, TEMPLATES, wrapText } from '../src/game/meme.js';

describe('wrapText', () => {
  test('wraps at word boundaries within the limit', () => {
    expect(wrapText('the quick brown fox jumps', 10)).toEqual(['the quick', 'brown fox', 'jumps']);
    expect(wrapText('short', 10)).toEqual(['short']);
  });

  test('keeps overlong words intact instead of looping', () => {
    expect(wrapText('supercalifragilistic', 5)).toEqual(['supercalifragilistic']);
    expect(wrapText('a supercalifragilistic b', 5)).toEqual(['a', 'supercalifragilistic', 'b']);
  });

  test('collapses whitespace and handles empty text', () => {
    expect(wrapText('  a   b  ', 10)).toEqual(['a b']);
    expect(wrapText('   ', 10)).toEqual([]);
  });
});

describe('templates', () => {
  test('has unique ids with positive slots', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of TEMPLATES) {
      expect(template.slots).toBeGreaterThan(0);
      expect(template.name.length).toBeGreaterThan(0);
    }
  });

  test('grid layouts demand exactly four texts', async () => {
    expect(await renderMeme('grid', ['a', 'b', 'c'])).toBeNull();
    expect(await renderMeme('grid', ['a', 'b', 'c', 'd'])).not.toBeNull();
  });
});

describe('renderMeme', () => {
  test('renders a PNG for every template', async () => {
    const renders = await Promise.all(
      TEMPLATES.map((template) => {
        const texts = Array.from({ length: template.slots }, (_, i) => `text ${i + 1}`);
        return renderMeme(template.id, texts);
      }),
    );
    for (const png of renders) {
      expect(png).not.toBeNull();
      expect([...(png as Buffer).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }
  });

  test('returns null on unknown templates or missing text slots', async () => {
    expect(await renderMeme('nope', ['x'])).toBeNull();
    expect(await renderMeme('drake', ['only one'])).toBeNull();
  });
});
