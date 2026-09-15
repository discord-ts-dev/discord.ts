import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import {
  Command,
  Module,
  PARAM_PREFIX_ARGS_METADATA,
  PrefixCommand,
  SLASH_COMMAND_METADATA,
  SetMetadata,
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

describe('unified command with subcommand scan', () => {
  test('nests sub on slash and prefix surfaces', async () => {
    class ShopProbe {
      buy(): void {}
    }
    apply(
      Command({ name: 'shop', description: 'Shop', slash: true, prefix: true }),
      ShopProbe.prototype,
      'buy',
    );
    apply(Subcommand({ name: 'buy', description: 'Buy item' }), ShopProbe.prototype, 'buy');
    class ShopApp {}
    Module({
      imports: [
        DiscordModule.forRoot({ token: 'test-token', clientId: 'test-client', intents: [] }),
      ],
      providers: [ShopProbe],
    })(ShopApp);
    const { discovery } = await createRuntime(ShopApp);
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => `${s.top} ${s.sub ?? ''}`),
        ['shop buy'],
      );
      assert.deepStrictEqual(
        discovery.prefix.map((p) => `${p.name} ${p.sub ?? ''}`),
        ['shop buy'],
      );
    } finally {
      await discovery.stop();
    }
  });
});

describe('legacy slash metadata fallback', () => {
  test('raw SLASH_COMMAND_METADATA still discovers as slash-only', async () => {
    class LegacyProbe {
      run(): void {}
    }
    apply(
      SetMetadata(SLASH_COMMAND_METADATA, { name: 'ping', description: 'Reply with pong' }),
      LegacyProbe.prototype,
      'run',
    );
    class LegacyApp {}
    Module({
      imports: [
        DiscordModule.forRoot({ token: 'test-token', clientId: 'test-client', intents: [] }),
      ],
      providers: [LegacyProbe],
    })(LegacyApp);
    const { discovery } = await createRuntime(LegacyApp);
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => s.top),
        ['ping'],
      );
      assert.deepStrictEqual(discovery.prefix, []);
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
