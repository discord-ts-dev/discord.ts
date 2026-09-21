import { describe, expect, test } from 'bun:test';
import {
  MemoryStore,
  buildHelp,
  buildHelpFromRegistry,
  getSettings,
  isCommandEnabled,
  setCommandEnabled,
  toggleableNames,
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

  const registry = [
    {
      name: 'hunt',
      description: 'Catch animals',
      category: 'Gameplay',
      descriptionLocalizations: { de: 'Jagen' },
      toggleable: true,
    },
    { name: 'zoo', description: 'Your zoo', category: 'Gameplay', toggleable: true },
    { name: 'ban', description: 'Ban a user', category: 'Admin', toggleable: false },
  ];

  test('buildHelpFromRegistry resolves one locale, falling back to the base description', () => {
    const de = buildHelpFromRegistry(registry, { locale: 'de' });
    expect(de[1]?.commands.map((c) => c.description)).toEqual(['Jagen', 'Your zoo']);
    const base = buildHelpFromRegistry(registry);
    expect(base[1]?.commands.map((c) => c.name)).toEqual(['hunt', 'zoo']);
    expect(base[1]?.commands[0]?.description).toBe('Catch animals');
    expect(base.map((s) => s.category)).toEqual(['Admin', 'Gameplay']);
  });

  test('toggleableNames lists toggleable names, sorted', () => {
    expect(toggleableNames([...registry].reverse())).toEqual(['hunt', 'zoo']);
    expect(toggleableNames([])).toEqual([]);
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
