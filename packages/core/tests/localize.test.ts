import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { initI18n } from '@discord.ts/i18n';
import { localizedPair, unknownLocales } from '../src/discovery/discord-localize.js';

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-localize-'));
}

function withLocales(dir: string, run: () => void): void {
  initI18n({ localesDir: dir });
  try {
    run();
  } finally {
    initI18n({ localesDir: path.join(dir, 'empty') });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('discord-localize', () => {
  test('flags loaded locales Discord does not accept', () => {
    const dir = tmp();
    for (const locale of ['de', 'EnglishUS'])
      fs.mkdirSync(path.join(dir, locale), { recursive: true });
    withLocales(dir, () => assert.deepEqual(unknownLocales(), ['EnglishUS']));
  });

  test('explicit localizations win over the catalog per locale', () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, 'de'));
    fs.writeFileSync(
      path.join(dir, 'de', 'commands.json'),
      JSON.stringify({ ping: { description: 'Pong auf Deutsch' } }),
    );
    withLocales(dir, () => {
      const merged = localizedPair('commands:ping', {
        description: { de: 'Overridden', fr: 'Pong FR' },
      });
      assert.equal(merged?.description?.['de'], 'Overridden');
      assert.equal(merged?.description?.['fr'], 'Pong FR');
      assert.equal(localizedPair('commands:missing')?.description, undefined);
    });
  });
});
