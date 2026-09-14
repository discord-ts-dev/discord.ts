import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  Command,
  Module,
  PARAM_PREFIX_ARGS_METADATA,
  PrefixCommand,
  Subcommand,
} from '@discord.ts/common';
import { DiscordModule, createRuntime } from '../src/index.js';
import { DiscordRoutingService } from '../src/discovery/discord-routing.service.js';
import { validateDiscoveryState } from '../src/discovery/discord-validate.js';
import type { PrefixEntry } from '../src/discovery/handler.types.js';

function apply(method: MethodDecorator, proto: object, name: string): void {
  const desc = Object.getOwnPropertyDescriptor(proto, name);
  method(proto, name, desc as PropertyDescriptor);
}

class QuestProbe {
  quest(): void {}
  reroll(): void {}
  buy(): void {}
}

apply(PrefixCommand({ name: 'quest' }), QuestProbe.prototype, 'quest');
apply(PrefixCommand({ name: 'quest' }), QuestProbe.prototype, 'reroll');
apply(Subcommand({ name: 'rr', description: 'Reroll quest' }), QuestProbe.prototype, 'reroll');
apply(
  Command({ name: 'shop', description: 'Shop', slash: false, prefix: true }),
  QuestProbe.prototype,
  'buy',
);
apply(Subcommand({ name: 'buy', description: 'Buy item' }), QuestProbe.prototype, 'buy');

class QuestApp {}
Module({
  imports: [DiscordModule.forRoot({ token: 'test-token', clientId: 'test-client', intents: [] })],
  providers: [QuestProbe],
})(QuestApp);

describe('prefix subcommand scan', () => {
  test('tags sub on prefix entries, slash untouched', async () => {
    const { discovery } = await createRuntime(QuestApp);
    try {
      const subs = discovery.prefix.map((p) => `${p.name} ${p.sub ?? ''}`);
      assert.deepStrictEqual(subs, ['quest ', 'quest rr', 'shop buy']);
      assert.deepStrictEqual(
        discovery.slash.map((s) => s.top),
        [],
      );
    } finally {
      await discovery.stop();
    }
  });
});

describe('prefix subcommand validation', () => {
  const entry = (name: string, sub?: string): PrefixEntry => ({
    instance: { constructor: { name: 'P' } } as unknown as PrefixEntry['instance'],
    method: 'm',
    name,
    aliases: [],
    sub,
  });

  test('same name with different subs passes', () => {
    validateDiscoveryState({
      slash: [],
      menus: [],
      buttons: [],
      selects: [],
      modals: [],
      autocompletes: [],
      events: [],
      prefix: [entry('quest'), entry('quest', 'rr')],
    });
  });

  test('same name and sub is a duplicate', () => {
    assert.throws(() =>
      validateDiscoveryState({
        slash: [],
        menus: [],
        buttons: [],
        selects: [],
        modals: [],
        autocompletes: [],
        events: [],
        prefix: [entry('quest', 'rr'), entry('quest', 'rr')],
      }),
    );
  });
});

describe('prefix subcommand routing', () => {
  const setup = (entries: { method: string; sub?: string }[]) => {
    const calls: [string, string[]][] = [];
    const instance = {} as Record<string, (...a: never[]) => unknown> & { constructor: object };
    for (const e of entries) {
      const fn = (...a: never[]): unknown => {
        calls.push([e.method, a[0] as string[]]);
        return undefined;
      };
      (instance as Record<string, unknown>)[e.method] = fn;
      Reflect.defineMetadata(PARAM_PREFIX_ARGS_METADATA, [0], fn);
      Reflect.defineMetadata('design:paramtypes', [Array], fn);
    }
    const prefix: PrefixEntry[] = entries.map((e) => ({
      instance: instance as PrefixEntry['instance'],
      method: e.method,
      name: 'quest',
      aliases: [],
      sub: e.sub,
    }));
    const handlers: Record<string, (m: unknown) => void> = {};
    const client = { on: (ev: string, fn: (m: unknown) => void): void => void (handlers[ev] = fn) };
    const routing = new DiscordRoutingService(
      client as never,
      { prefix: '!' } as never,
      { prefix, events: [] } as never,
      new Map(),
    );
    routing.subscribe();
    const send = async (content: string): Promise<void> => {
      handlers['messageCreate']?.({ author: { bot: false }, content });
      await new Promise((r) => setTimeout(r, 10));
    };
    return { calls, send };
  };

  test('first token routes to sub, rest to args', async () => {
    const { calls, send } = setup([{ method: 'quest' }, { method: 'reroll', sub: 'rr' }]);
    await send('!quest rr 2');
    assert.deepStrictEqual(calls, [['reroll', ['2']]]);
  });

  test('no sub match falls back to bare handler', async () => {
    const { calls, send } = setup([{ method: 'quest' }, { method: 'reroll', sub: 'rr' }]);
    await send('!quest hello');
    assert.deepStrictEqual(calls, [['quest', ['hello']]]);
  });

  test('sub match is case-insensitive', async () => {
    const { calls, send } = setup([{ method: 'quest' }, { method: 'reroll', sub: 'rr' }]);
    await send('!quest RR 2');
    assert.deepStrictEqual(calls, [['reroll', ['2']]]);
  });

  test('no bare handler and no match invokes nothing', async () => {
    const { calls, send } = setup([{ method: 'reroll', sub: 'rr' }]);
    await send('!quest zz');
    assert.deepStrictEqual(calls, []);
  });
});
