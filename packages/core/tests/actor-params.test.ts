import assert from 'node:assert';
import { describe, test } from 'node:test';
import { Author, Guild, Locale } from '@discord.ts/common';
import { buildArgs, buildEventArgs } from '../src/discovery/discord-args.js';
import type { Handler } from '../src/discovery/handler.types.js';

class Cmd {
  run(_ctx: unknown, _guild: unknown, _author: unknown): void {}
}
Guild()(Cmd.prototype, 'run', 1);
Author()(Cmd.prototype, 'run', 2);

class LocaleCmd {
  run(_ctx: unknown, _locale: unknown): void {}
}
Locale()(LocaleCmd.prototype, 'run', 1);

function handler(): Handler {
  const instance = new Cmd() as unknown as Record<string, (...args: never[]) => unknown>;
  return { instance, method: 'run' };
}

function localeHandler(): Handler {
  const instance = new LocaleCmd() as unknown as Record<string, (...args: never[]) => unknown>;
  return { instance, method: 'run' };
}

describe('Guild/Author args', () => {
  test('interaction resolves guild and user', () => {
    const guild = { id: 'g' };
    const user = { id: 'u' };
    const args = buildArgs(handler(), { guild, user });
    assert.strictEqual(args[1], guild);
    assert.strictEqual(args[2], user);
  });

  test('message resolves guild and author', () => {
    const guild = { id: 'g' };
    const author = { id: 'a' };
    const args = buildArgs(handler(), { guild, author });
    assert.strictEqual(args[1], guild);
    assert.strictEqual(args[2], author);
  });

  test('DM interaction resolves null guild', () => {
    const user = { id: 'u' };
    const args = buildArgs(handler(), { user });
    assert.strictEqual(args[1], null);
    assert.strictEqual(args[2], user);
  });

  test('event path fills empty slots from the head arg', () => {
    const msg = { guild: { id: 'g' }, author: { id: 'a' } };
    const args = buildEventArgs(handler(), [msg]);
    assert.strictEqual(args[0], msg);
    assert.deepStrictEqual(args[1], { id: 'g' });
    assert.deepStrictEqual(args[2], { id: 'a' });
  });
});

describe('Locale args', () => {
  test('interaction locale wins, then guild preferred, then default', () => {
    assert.equal(buildArgs(localeHandler(), { locale: 'vi' })[1], 'vi');
    assert.equal(buildArgs(localeHandler(), { guild: { preferredLocale: 'ja' } })[1], 'ja');
    assert.equal(buildArgs(localeHandler(), {}, undefined, 'fr')[1], 'fr');
  });
});
