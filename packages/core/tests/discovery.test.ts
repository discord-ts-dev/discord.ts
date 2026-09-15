import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { ApplicationCommandType } from 'discord.js';
import {
  Autocomplete,
  Button,
  Command,
  ContextMenu,
  Modal,
  OnEvent,
  PARAM_OPTIONS_METADATA,
  PrefixCommand,
  SlashCommand,
  StringOption,
  StringSelect,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { DiscordDiscoveryService, type DiscordSyncService } from '../src/index.js';
import type { SlashEntry } from '../src/discovery/handler.types.js';

interface Calls {
  synced: unknown[][];
  loggedIn: string[];
  destroyed: number;
}

function fakes(skipRegistration = true) {
  const calls: Calls = { synced: [], loggedIn: [], destroyed: 0 };
  const client = {
    login: async (token: string) => {
      calls.loggedIn.push(token);
      return 'ok';
    },
    destroy: async () => {
      calls.destroyed += 1;
    },
  };
  const sync = {
    sync: async (body: unknown[]) => {
      calls.synced.push(body);
    },
  } as unknown as DiscordSyncService;
  const service = new DiscordDiscoveryService(
    client as never,
    { token: 'tok', clientId: 'cid', skipRegistration, intents: [] },
    sync,
  );
  return { service, calls };
}

function apply(decorator: MethodDecorator, proto: object, name: string): void {
  decorator(proto, name, Object.getOwnPropertyDescriptor(proto, name) as PropertyDescriptor);
}

class PingDto {
  @StringOption({ name: 'q', description: 'Query', required: false })
  q?: string;
}

const QuestGroup = createCommandGroupDecorator({
  name: 'quest',
  description: 'Quests',
  prefix: true,
});

class Probe {
  ping(): void {}
  plain(): void {}
  grouped(): void {}
  menu(): void {}
  button(): void {}
  select(): void {}
  modal(): void {}
  auto(): void {}
  event(): void {}
  prefix(): void {}
}

apply(SlashCommand({ name: 'ping', description: 'Pong' }), Probe.prototype, 'ping');
apply(
  Command({ name: 'plain', description: 'Plain', slash: true, prefix: true }),
  Probe.prototype,
  'plain',
);
apply(
  Command({ name: 'quest', description: 'Quests', slash: true, prefix: false }),
  Probe.prototype,
  'grouped',
);
apply(Subcommand({ name: 'reroll', description: 'Reroll' }), Probe.prototype, 'grouped');
(QuestGroup({}) as ClassDecorator)(Probe);
apply(
  ContextMenu({ name: 'Inspect', type: ApplicationCommandType.Message }),
  Probe.prototype,
  'menu',
);
apply(Button(/^confirm:/), Probe.prototype, 'button');
apply(StringSelect('pick'), Probe.prototype, 'select');
apply(Modal('form'), Probe.prototype, 'modal');
apply(Autocomplete('ping'), Probe.prototype, 'auto');
apply(OnEvent('ready'), Probe.prototype, 'event');
apply(PrefixCommand({ name: 'echo', aliases: ['e'] }), Probe.prototype, 'prefix');

function entry(over: Partial<SlashEntry>): SlashEntry {
  return {
    instance: { run: () => undefined } as never,
    method: 'run',
    top: 'ping',
    topDescription: 'Pong',
    meta: { name: 'ping', description: 'Pong' },
    ...over,
  };
}

describe('DiscordDiscoveryService.scan', () => {
  test('picks up every handler kind', () => {
    const { service } = fakes();
    service.init([new Probe()]);
    assert.deepEqual(
      service.slash.map((s) => `${s.top} ${s.sub ?? ''}`.trim()),
      ['ping', 'plain', 'quest reroll'],
    );
    assert.deepEqual(
      service.prefix.map((p) => `${p.name} ${p.sub ?? ''}`.trim()),
      ['plain', 'quest reroll', 'echo'],
    );
    assert.deepEqual(
      [service.menus.length, service.buttons.length, service.selects.length, service.modals.length],
      [1, 1, 1, 1],
    );
    assert.deepEqual([service.autocompletes.length, service.events.length], [1, 1]);
    assert.equal(service.prefix[2]?.aliases[0], 'e');
  });

  test('rejects a @Command with no surface flags', () => {
    class Bad {
      nope(): void {}
    }
    apply(
      Command({ name: 'nope', description: 'Nope', slash: false, prefix: false }),
      Bad.prototype,
      'nope',
    );
    const { service } = fakes();
    assert.throws(() => service.init([new Bad()]), /set slash or prefix to true/);
  });
});

describe('DiscordDiscoveryService.buildJson', () => {
  test('builds plain, subcommand, grouped and menu JSON', () => {
    const { service } = fakes();
    service.slash.push(
      entry({
        meta: {
          name: 'ping',
          description: 'Pong',
          nsfw: true,
          defaultMemberPermissions: '8',
          contexts: [0],
        },
      }),
      entry({
        top: 'plain',
        topDescription: 'Plain',
        meta: { name: 'plain', description: 'Plain' },
      }),
      entry({
        top: 'plain',
        topDescription: 'Plain',
        sub: 'one',
        subDescription: 'One',
        meta: { name: 'plain', description: 'Plain' },
      }),
      entry({
        top: 'quest',
        topDescription: 'Quests',
        group: 'daily',
        groupDescription: 'Daily quests',
        sub: 'reroll',
        subDescription: 'Reroll',
        meta: { name: 'quest', description: 'Quests' },
      }),
      entry({
        top: 'quest',
        topDescription: 'Quests',
        group: 'daily',
        groupDescription: 'Daily quests',
        sub: 'lock',
        subDescription: 'Lock',
        meta: { name: 'quest', description: 'Quests' },
      }),
    );
    service.menus.push(
      {
        instance: { run: () => undefined } as never,
        method: 'run',
        name: 'Inspect',
        type: ApplicationCommandType.Message,
        meta: {
          name: 'Inspect',
          type: ApplicationCommandType.Message,
          defaultMemberPermissions: '16',
          contexts: [1],
        },
      },
      {
        instance: { run: () => undefined } as never,
        method: 'run',
        name: 'PlainMenu',
        type: ApplicationCommandType.User,
        meta: { name: 'PlainMenu', type: ApplicationCommandType.User },
      },
    );
    const json = service.buildJson() as Array<Record<string, unknown>>;
    const byName = new Map(json.map((j) => [j['name'] as string, j]));
    assert.equal(byName.get('ping')?.['nsfw'], true);
    assert.deepEqual(byName.get('ping')?.['options'], []);
    const plain = byName.get('plain') as { options: Array<{ name: string }> } | undefined;
    assert.deepEqual(
      plain?.options.map((o) => o.name),
      ['one'],
    );
    const quest = byName.get('quest') as {
      options: Array<{ name: string; options: Array<{ name: string }> }>;
    };
    assert.deepEqual(
      quest.options[0]?.options.map((o) => o.name),
      ['reroll', 'lock'],
    );
    const menu = byName.get('Inspect') as {
      default_member_permissions: string;
      contexts: number[];
    };
    assert.equal(menu.default_member_permissions, '16');
    assert.deepEqual(menu.contexts, [1]);
    const plainMenu = byName.get('PlainMenu') as {
      default_member_permissions?: unknown;
      contexts?: unknown;
    };
    assert.equal(plainMenu.default_member_permissions, undefined);
    assert.equal(plainMenu.contexts, undefined);
  });

  test('mirrors DTO options onto the command JSON', () => {
    const { service } = fakes();
    const instance = new Probe();
    Reflect.defineMetadata(PARAM_OPTIONS_METADATA, [0], Probe.prototype.ping);
    Reflect.defineMetadata('design:paramtypes', [PingDto], instance, 'ping');
    service.slash.push({
      instance: instance as never,
      method: 'ping',
      top: 'search',
      topDescription: 'Search',
      meta: { name: 'search', description: 'Search' },
    });
    const json = service.buildJson() as Array<{ name: string; options?: Array<{ name: string }> }>;
    assert.deepEqual(
      json[0]?.options?.map((o) => o.name),
      ['q'],
    );
  });
});

describe('DiscordDiscoveryService start and stop', () => {
  test('syncs before login unless registration is skipped', async () => {
    const { service, calls } = fakes(false);
    service.init([new Probe()]);
    await service.start();
    assert.equal(calls.synced.length, 1);
    assert.ok((calls.synced[0]?.length ?? 0) > 0);
    assert.deepEqual(calls.loggedIn, ['tok']);
    await service.stop();
    assert.equal(calls.destroyed, 1);
  });

  test('skips registration but still logs in', async () => {
    const { service, calls } = fakes(true);
    service.init([]);
    await service.start();
    assert.deepEqual(calls.synced, []);
    assert.deepEqual(calls.loggedIn, ['tok']);
  });
});
