import 'reflect-metadata';
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Module } from '@discord.ts/common';
import { DiscordModule, resolveDiscordOptions } from '../src/index.js';

const dirs: string[] = [];
function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-module-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('DiscordModule', () => {
  test('is instantiable and builds sync and async defs', () => {
    const instance = new DiscordModule();
    assert.ok(instance instanceof DiscordModule);
    const options = { token: 't', clientId: 'c', intents: [] };
    assert.deepEqual(DiscordModule.forRoot(options), {
      module: DiscordModule,
      kind: 'sync',
      options,
    });
    assert.deepEqual(DiscordModule.forRootAsync({ cwd: '/x' }), {
      module: DiscordModule,
      kind: 'async',
      opts: { cwd: '/x' },
    });
  });
});

describe('resolveDiscordOptions', () => {
  test('returns inline options and providers for a sync def', async () => {
    class Provider {}
    class App {}
    Module({
      imports: [DiscordModule.forRoot({ token: 't', clientId: 'c', intents: [] })],
      providers: [Provider],
    })(App);
    const resolved = await resolveDiscordOptions(App);
    assert.deepEqual(resolved.options, { token: 't', clientId: 'c', intents: [] });
    assert.deepEqual(resolved.providers, [Provider]);
  });

  test('merges file/env with inline overrides, dropping undefined ones', async () => {
    class App {}
    Module({
      imports: [
        DiscordModule.forRootAsync({
          cwd: tmp(),
          skipValidation: true,
          overrides: { token: 'inline', clientId: undefined, respawn: false },
        }),
      ],
    })(App);
    const resolved = await resolveDiscordOptions(App);
    assert.equal(resolved.options.token, 'inline');
    assert.equal(resolved.options.respawn, false);
    assert.deepEqual(resolved.providers, []);
  });

  test('falls back to config loading when no def is imported', async () => {
    class App {}
    Module({})(App);
    const resolved = await resolveDiscordOptions(App, { skipValidation: true });
    assert.equal(resolved.options.skipRegistration, false);
    assert.deepEqual(resolved.options.development, []);
  });

  test('ignores unrelated imports', async () => {
    class App {}
    Module({ imports: [{ module: class Other {} }, null] })(App);
    const resolved = await resolveDiscordOptions(App, { skipValidation: true });
    assert.equal(resolved.options.skipRegistration, false);
  });
});
