import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { Module, PrefixCommand, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { DiscordModule, createRuntime } from '../src/index.js';

const QuestGroup = createCommandGroupDecorator({ name: 'quest', description: 'Quests' });

function apply(method: MethodDecorator, proto: object, name: string): void {
  const desc = Object.getOwnPropertyDescriptor(proto, name);
  method(proto, name, desc as PropertyDescriptor);
}

function appWith(groupMeta: object, methods: string[]): new () => object {
  class Probe {
    rr(): void {}
    lock(): void {}
  }
  (QuestGroup(groupMeta as Partial<{ name: string; description: string }>) as ClassDecorator)(
    Probe,
  );
  for (const m of methods)
    apply(Subcommand({ name: m, description: `${m} quest` }), Probe.prototype, m);
  class App {}
  Module({
    imports: [DiscordModule.forRoot({ token: 't', clientId: 'c', intents: [] })],
    providers: [Probe],
  })(App);
  return App as new () => object;
}

describe('group command surfaces', () => {
  test('prefix:true registers slash subs and prefix sub-routes', async () => {
    const { discovery } = await createRuntime(appWith({ prefix: true }, ['rr', 'lock']));
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => `${s.top} ${s.sub}`),
        ['quest rr', 'quest lock'],
      );
      assert.deepStrictEqual(
        discovery.prefix.map((p) => `${p.name} ${p.sub ?? ''}`),
        ['quest rr', 'quest lock'],
      );
    } finally {
      await discovery.stop();
    }
  });

  test('default flags keep slash only', async () => {
    const { discovery } = await createRuntime(appWith({}, ['rr']));
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => s.top),
        ['quest'],
      );
      assert.deepStrictEqual(discovery.prefix, []);
    } finally {
      await discovery.stop();
    }
  });

  test('slash:false drops slash, keeps prefix', async () => {
    const { discovery } = await createRuntime(appWith({ slash: false, prefix: true }, ['rr']));
    try {
      assert.deepStrictEqual(discovery.slash, []);
      assert.deepStrictEqual(
        discovery.prefix.map((p) => `${p.name} ${p.sub ?? ''}`),
        ['quest rr'],
      );
    } finally {
      await discovery.stop();
    }
  });

  test('explicit PrefixCommand on same name and sub fails boot', async () => {
    class Probe {
      rr(): void {}
    }
    (QuestGroup({ prefix: true }) as ClassDecorator)(Probe);
    apply(Subcommand({ name: 'rr', description: 'Reroll' }), Probe.prototype, 'rr');
    apply(PrefixCommand({ name: 'quest' }), Probe.prototype, 'rr');
    class App {}
    Module({
      imports: [DiscordModule.forRoot({ token: 't', clientId: 'c', intents: [] })],
      providers: [Probe],
    })(App);
    await assert.rejects(createRuntime(App));
  });
});
