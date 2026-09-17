import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'bun:test';
import { availableLocales, initI18n, lookup, resolveLocale, t } from '../src/index.js';

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

const fixtureRoot = fixtures();

describe('locale catalogs', () => {
  test('t() reads namespaced files with params', () => {
    assert.equal(t('common:hello', { name: 'a' }, 'en'), 'hi a');
    assert.equal(t('errors.oops', { what: 'x' }, 'en'), 'bad x');
  });

  test('t() falls back to the default locale, then echoes', () => {
    assert.equal(t('errors.oops', { what: 'x' }, 'vi'), 'bad x');
    assert.equal(t('missing.key', undefined, 'en'), 'missing.key');
  });

  test('lookup reads one locale without default fallback', () => {
    assert.equal(lookup('common:hello', 'vi'), 'chao {name}');
    assert.equal(lookup('common:hello', 'en'), 'hi {name}');
    assert.equal(lookup('errors.oops', 'vi'), undefined);
    assert.equal(lookup('missing.key', 'en'), undefined);
  });

  test('resolveLocale prefers interaction, then guild, then fallback', () => {
    assert.equal(resolveLocale({ locale: 'vi' }), 'vi');
    assert.equal(resolveLocale({ guild: { preferredLocale: 'ja' } }), 'ja');
    assert.equal(resolveLocale({}, 'fr'), 'fr');
    assert.equal(resolveLocale({}), 'en');
  });

  test('languages allowlist restricts loading, availableLocales lists loaded', () => {
    assert.deepStrictEqual(availableLocales(), ['en', 'vi']);
    initI18n({ defaultLocale: 'en', localesDir: './locales', languages: ['vi'] }, fixtureRoot);
    assert.deepStrictEqual(availableLocales(), ['vi']);
    assert.equal(t('common:hello', { name: 'a' }, 'en'), 'common:hello');
  });
});
