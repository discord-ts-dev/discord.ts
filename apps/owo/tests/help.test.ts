import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { initI18n } from '@discord.ts/i18n';
import { HelpCommand } from '../src/commands/help.command.js';

initI18n({ defaultLocale: 'en', languages: ['en'] }, join(import.meta.dir, '..'));

type EmbedJson = { fields?: { name: string; value: string }[] };
type ReplyBody = { embeds: { toJSON(): EmbedJson }[] };

describe('help from registry', () => {
  const entries = [
    { name: 'hunt', description: 'Catch animals', category: 'Gameplay', toggleable: true },
    { name: 'zoo', description: 'Your zoo', category: 'Gameplay', toggleable: true },
    {
      name: 'help',
      description: 'Show the Paw command list',
      category: 'General',
      toggleable: false,
    },
  ];

  test('renders registry sections, General last', async () => {
    let embeds: ReplyBody['embeds'] = [];
    const ix = {
      locale: 'en',
      reply: async (body: ReplyBody) => {
        embeds = body.embeds;
      },
    };
    const cmd = new HelpCommand({ helpEntries: () => entries } as never);
    await cmd.help(ix as never, 'en');
    const fields = embeds[0]?.toJSON().fields ?? [];
    expect(fields.map((f) => f.name)).toEqual(['Gameplay', 'General']);
    expect(fields[0]?.value).toBe('**/hunt** — Catch animals\n**/zoo** — Your zoo');
  });

  test('prefers the locale description when the registry carries one', async () => {
    let embeds: ReplyBody['embeds'] = [];
    const ix = {
      locale: 'de',
      reply: async (body: ReplyBody) => {
        embeds = body.embeds;
      },
    };
    const localized = [
      {
        name: 'hunt',
        description: 'Catch animals',
        descriptionLocalizations: { de: 'Tiere fangen' },
        category: 'Gameplay',
        toggleable: false,
      },
    ];
    const cmd = new HelpCommand({ helpEntries: () => localized } as never);
    await cmd.help(ix as never, 'de');
    expect(embeds[0]?.toJSON().fields?.[0]?.value).toBe('**/hunt** — Tiere fangen');
  });

  test('sections over the embed field cap continue into nameless fields', async () => {
    let embeds: ReplyBody['embeds'] = [];
    const ix = {
      locale: 'en',
      reply: async (body: ReplyBody) => {
        embeds = body.embeds;
      },
    };
    const long = 'x'.repeat(600);
    const big = [
      { name: 'a', description: long, category: 'Gameplay', toggleable: false },
      { name: 'b', description: long, category: 'Gameplay', toggleable: false },
    ];
    const cmd = new HelpCommand({ helpEntries: () => big } as never);
    await cmd.help(ix as never, 'en');
    const fields = embeds[0]?.toJSON().fields ?? [];
    expect(fields.map((f) => f.name)).toEqual(['Gameplay', '\u200b']);
    expect(fields.every((f) => f.value.length <= 1024)).toBe(true);
  });
});
