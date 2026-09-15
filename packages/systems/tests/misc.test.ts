import { describe, expect, test } from 'bun:test';
import {
  MemoryStore,
  buildHelp,
  getSettings,
  isCommandEnabled,
  setCommandEnabled,
} from '../src/index.js';

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
  test('defaults and toggles', async () => {
    const s = new MemoryStore();
    expect(await getSettings(s, 'g')).toEqual({});
    expect(await isCommandEnabled(s, 'g', 'Hunt')).toBe(true);
    await setCommandEnabled(s, 'g', 'hunt', false);
    expect(await isCommandEnabled(s, 'g', 'HUNT')).toBe(false);
    await setCommandEnabled(s, 'g', 'hunt', true);
    expect(await isCommandEnabled(s, 'g', 'hunt')).toBe(true);
  });
});
