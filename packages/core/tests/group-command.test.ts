import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { Module, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { DiscordModule, createRuntime } from '../src/index.js';

const QuestGroup = createCommandGroupDecorator({ name: 'quest', description: 'Quests' });

function apply(method: MethodDecorator, proto: object, name: string): void {
  const desc = Object.getOwnPropertyDescriptor(proto, name);
  method(proto, name, desc as PropertyDescriptor);
}

function appWith(methods: string[]): new () => object {
  class Probe {
    rr(): void {}
    lock(): void {}
  }
  (QuestGroup() as ClassDecorator)(Probe);
  for (const m of methods)
    apply(Subcommand({ name: m, description: `${m} quest` }), Probe.prototype, m);
  class App {}
  Module({
    imports: [DiscordModule.forRoot({ token: 't', clientId: 'c', intents: [] })],
    providers: [Probe],
  })(App);
  return App as new () => object;
}

describe('group commands', () => {
  test('registers member subcommands as slash subs', async () => {
    const { discovery } = await createRuntime(appWith(['rr', 'lock']));
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => `${s.top} ${s.sub}`),
        ['quest rr', 'quest lock'],
      );
    } finally {
      await discovery.stop();
    }
  });
});
