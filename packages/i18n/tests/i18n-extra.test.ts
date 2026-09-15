import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { availableLocales, initI18n, resolveLocale, t } from '../src/index.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-i18n-'));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, 'en-US'));
  fs.writeFileSync(
    path.join(dir, 'en-US/common.json'),
    JSON.stringify({ hi: 'Hello', greet: 'Hi {name}', nested: { deep: 'found' } }),
  );
  fs.writeFileSync(path.join(dir, 'en-US/notes.txt'), 'ignored');
  fs.writeFileSync(
    path.join(dir, 'fr.json'),
    JSON.stringify({ common: { hi: 'Bonjour' }, plain: 'not-a-table' }),
  );
  fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json');
  fs.symlinkSync(path.join(dir, 'missing-target.json'), path.join(dir, 'dangling.json'));
  return dir;
}

describe('initI18n flat catalogs and broken files', () => {
  test('flat <lang>.json files become namespaces, bad files are skipped', () => {
    const dir = fixture();
    initI18n({ localesDir: dir, defaultLocale: 'en-US' }, os.tmpdir());
    const locales = availableLocales();
    assert.ok(locales.includes('en-US'));
    assert.ok(locales.includes('fr'));
    assert.ok(locales.includes('broken'));
    assert.ok(!locales.includes('dangling'));
    assert.equal(t('common:hi', undefined, 'fr'), 'Bonjour');
    assert.equal(t('common:greet', { name: 'Ada' }, 'en-US'), 'Hi Ada');
    assert.equal(t('common:greet', {}, 'en-US'), 'Hi {name}');
    assert.equal(t('common:nested.deep', undefined, 'en-US'), 'found');
    assert.equal(t('common:nested.deep.more', undefined, 'en-US'), 'common:nested.deep.more');
    assert.equal(t('plain', undefined, 'fr'), 'plain');
    assert.equal(t('common:hi', undefined, 'broken'), 'Hello');
    assert.equal(t('ns:missing', undefined, 'en-US'), 'ns:missing');
    assert.equal(t('unknown.hi', undefined, 'en-US'), 'unknown.hi');
    assert.equal(t('common.hi', undefined, 'en-US'), 'Hello');
  });

  test('missing locales dir leaves catalogs empty but functional', () => {
    initI18n({ localesDir: path.join(os.tmpdir(), 'discord-ts-none') }, os.tmpdir());
    assert.deepEqual(availableLocales(), []);
    assert.equal(t('key'), 'key');
  });
});

describe('resolveLocale fallbacks', () => {
  test('locale wins, then guild, then fallback, then default', () => {
    assert.equal(resolveLocale({ locale: 'fr' }), 'fr');
    assert.equal(resolveLocale({ guild: { preferredLocale: 'de' } }), 'de');
    assert.equal(resolveLocale({}, 'es'), 'es');
    assert.equal(resolveLocale({ locale: '' }, 'es'), 'en-US');
    assert.equal(resolveLocale({}), 'en-US');
  });
});
