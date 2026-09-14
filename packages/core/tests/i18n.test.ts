import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { Locale } from '@discord.ts/common';
import { buildArgs } from '../src/discovery/discord-args.js';
import { initI18n, resolveLocale, t } from '../src/i18n.js';
import type { Handler } from '../src/discovery/handler.types.js';

function fixtures(): string {
  const root = mkdtempSync(join(tmpdir(), 'i18n-'));
  const write = (lang: string, ns: string, table: unknown): void => {
    mkdirSync(join(root, 'locales', lang), { recursive: true });
    writeFileSync(join(root, 'locales', lang, `${ns}.json`), JSON.stringify(table));
  };
  write('en', 'common', { hello: 'hi {name}' });
  write('en', 'errors', { oops: 'bad {what}' });
  write('vi', 'common', { hello: 'chao {name}' });
  initI18n({ defaultLocale: 'en', localesDir: './locales' }, root);
  return root;
}

fixtures();

class Cmd {
  run(_ctx: unknown, _locale: unknown): void {}
}
Locale()(Cmd.prototype, 'run', 1);

function handler(): Handler {
  const instance = new Cmd() as unknown as Record<string, (...args: never[]) => unknown>;
  return { instance, method: 'run' };
}

describe('native i18n', () => {
  test('t() reads namespaced files with params', () => {
    assert.equal(t('common:hello', { name: 'a' }, 'en'), 'hi a');
    assert.equal(t('errors.oops', { what: 'x' }, 'en'), 'bad x');
  });

  test('t() falls back to the default locale, then echoes', () => {
    assert.equal(t('errors.oops', { what: 'x' }, 'vi'), 'bad x');
    assert.equal(t('missing.key', undefined, 'en'), 'missing.key');
  });

  test('resolveLocale prefers interaction, then guild, then fallback', () => {
    assert.equal(resolveLocale({ locale: 'vi' }), 'vi');
    assert.equal(resolveLocale({ guild: { preferredLocale: 'ja' } }), 'ja');
    assert.equal(resolveLocale({}, 'fr'), 'fr');
    assert.equal(resolveLocale({}), 'en');
  });

  test('@Locale() resolves through buildArgs', () => {
    assert.equal(buildArgs(handler(), { locale: 'vi' })[1], 'vi');
    assert.equal(buildArgs(handler(), { guild: { preferredLocale: 'ja' } })[1], 'ja');
  });
});
