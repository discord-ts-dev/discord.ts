import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { Events } from 'discord.js';
import { INTERACTION_CREATE, MESSAGE_CREATE, flush, handlerFor, setup } from './routing-helpers.js';
describe('DiscordRoutingService.subscribe', () => {
  test('wires gateway, debug and per-handler event listeners', () => {
    const h = setup();
    h.discovery['events'] = [
      {
        instance: { onReady: () => undefined } as never,
        method: 'onReady',
        event: 'ready',
        once: true,
      },
      {
        instance: { onMsg: () => undefined } as never,
        method: 'onMsg',
        event: 'messageCreate',
        once: false,
      },
    ];
    h.discovery['prefix'] = [
      { instance: { run: () => undefined } as never, method: 'run', name: 'echo', aliases: [] },
    ];
    process.env['DISCORD_DEBUG'] = 'true';
    try {
      h.routing.subscribe();
    } finally {
      delete process.env['DISCORD_DEBUG'];
    }
    assert.equal(h.handlers.get(INTERACTION_CREATE)?.length, 1);
    assert.equal(h.handlers.get(Events.Warn)?.length, 1);
    assert.equal(h.handlers.get(Events.Error)?.length, 1);
    assert.equal(h.handlers.get(Events.Debug)?.length, 1);
    assert.equal(h.handlers.get('ready')?.length, 1);
    assert.equal(h.handlers.get('messageCreate')?.length, 2);
    h.handlers.get(Events.Warn)?.[0]?.('careful');
    h.handlers.get(Events.Error)?.[0]?.(new Error('boom'));
    h.handlers.get(Events.Debug)?.[0]?.('detail');
  });

  test('invokes per-event listeners through the routing invoke path', async () => {
    const h = setup();
    const seen: unknown[] = [];
    h.discovery['events'] = [
      {
        instance: {
          onReady: (...args: unknown[]) => void seen.push(args),
        } as never,
        method: 'onReady',
        event: 'ready',
        once: false,
      },
    ];
    h.routing.subscribe();
    h.handlers.get('ready')?.[0]?.('first', 'second');
    await flush();
    assert.equal(seen.length, 1);
  });

  test('skips prefix and debug listeners when unused', () => {
    const h = setup();
    h.routing.subscribe();
    assert.equal(h.handlers.get(MESSAGE_CREATE), undefined);
    assert.equal(h.handlers.get(Events.Debug), undefined);
  });
});

describe('DiscordRoutingService.route', () => {
  test('routes slash commands with group, sub and plain fallbacks', async () => {
    const h = setup();
    const grouped = handlerFor(h, 'grouped');
    const subbed = handlerFor(h, 'subbed');
    const plain = handlerFor(h, 'plain');
    h.discovery['slash'] = [
      { ...grouped, top: 'quest', group: 'daily', sub: 'reroll' },
      { ...subbed, top: 'quest', sub: 'reroll' },
      { ...plain, top: 'ping' },
    ];
    h.routing.subscribe();
    const route = h.handlers.get(INTERACTION_CREATE)?.[0] as (i: unknown) => void;

    route({
      isChatInputCommand: () => true,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      commandName: 'quest',
      options: { getSubcommandGroup: () => 'daily', getSubcommand: () => 'reroll' },
    });
    await flush();
    assert.deepEqual(h.calls, ['grouped']);

    route({
      isChatInputCommand: () => true,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      commandName: 'quest',
      options: { getSubcommandGroup: () => null, getSubcommand: () => 'reroll' },
    });
    await flush();
    assert.deepEqual(h.calls, ['grouped', 'subbed']);

    route({
      isChatInputCommand: () => true,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      commandName: 'ping',
      options: { getSubcommandGroup: () => null, getSubcommand: () => null },
    });
    await flush();
    assert.deepEqual(h.calls, ['grouped', 'subbed', 'plain']);

    route({
      isChatInputCommand: () => true,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      commandName: 'missing',
      options: { getSubcommandGroup: () => null, getSubcommand: () => null },
    });
    await flush();
    assert.equal(h.calls.length, 3);
  });

  test('routes menus, buttons, selects, modals and autocomplete', async () => {
    const h = setup();
    const menu = handlerFor(h, 'menu');
    const button = handlerFor(h, 'button');
    const select = handlerFor(h, 'select');
    const modal = handlerFor(h, 'modal');
    const auto = handlerFor(h, 'auto');
    h.discovery['menus'] = [{ ...menu, name: 'Inspect' }];
    h.discovery['buttons'] = [
      { ...button, customId: /^confirm:/ },
      { ...handlerFor(h, 'plainButton'), customId: 'exact' },
    ];
    h.discovery['selects'] = [
      { ...select, kind: 'string', customId: 'pick' },
      { ...handlerFor(h, 'userSelect'), kind: 'user', customId: 'pick' },
      { ...handlerFor(h, 'roleSelect'), kind: 'role', customId: 'pick' },
      { ...handlerFor(h, 'channelSelect'), kind: 'channel', customId: 'pick' },
      { ...handlerFor(h, 'mentionableSelect'), kind: 'mentionable', customId: 'pick' },
    ];
    h.discovery['modals'] = [{ ...modal, customId: 'form' }];
    h.discovery['autocompletes'] = [
      { ...auto, commandName: 'ping' },
      { ...handlerFor(h, 'anyAuto') },
    ];
    h.routing.subscribe();
    const route = h.handlers.get(INTERACTION_CREATE)?.[0] as (i: unknown) => void;

    const base = {
      isChatInputCommand: () => false,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
    };
    route({ ...base, isContextMenuCommand: () => true, commandName: 'Inspect' });
    await flush();
    assert.deepEqual(h.calls, ['menu']);

    route({ ...base, isButton: () => true, customId: 'confirm:yes' });
    await flush();
    assert.deepEqual(h.calls, ['menu', 'button']);

    route({ ...base, isButton: () => true, customId: 'exact' });
    await flush();
    assert.deepEqual(h.calls, ['menu', 'button', 'plainButton']);

    route({ ...base, isButton: () => true, customId: 'unknown' });
    await flush();
    assert.equal(h.calls.length, 3);

    for (const [kind, marker] of [
      ['string', 'isStringSelectMenu'],
      ['user', 'isUserSelectMenu'],
      ['role', 'isRoleSelectMenu'],
      ['channel', 'isChannelSelectMenu'],
      ['mentionable', 'isMentionableSelectMenu'],
    ] as const) {
      route({
        ...base,
        customId: 'pick',
        isStringSelectMenu: () => marker === 'isStringSelectMenu',
        isUserSelectMenu: () => marker === 'isUserSelectMenu',
        isRoleSelectMenu: () => marker === 'isRoleSelectMenu',
        isChannelSelectMenu: () => marker === 'isChannelSelectMenu',
        isMentionableSelectMenu: () => marker === 'isMentionableSelectMenu',
      });
      await flush();
      assert.equal(h.calls.at(-1), kind === 'string' ? 'select' : `${kind}Select`);
    }

    route({ ...base, isModalSubmit: () => true, customId: 'form' });
    await flush();
    assert.equal(h.calls.at(-1), 'modal');

    route({ ...base, isAutocomplete: () => true, commandName: 'ping' });
    await flush();
    assert.equal(h.calls.at(-1), 'auto');

    route({ ...base, isAutocomplete: () => true, commandName: 'other' });
    await flush();
    assert.equal(h.calls.at(-1), 'anyAuto');

    route({ ...base, isAutocomplete: () => true });
    await flush();
    assert.equal(h.calls.at(-1), 'anyAuto');
  });

  test('plain interaction falls through when no select kind matches', async () => {
    const h = setup();
    h.routing.subscribe();
    const route = h.handlers.get(INTERACTION_CREATE)?.[0] as (i: unknown) => void;
    route({
      isChatInputCommand: () => false,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      isStringSelectMenu: () => false,
      isUserSelectMenu: () => false,
      isRoleSelectMenu: () => false,
      isChannelSelectMenu: () => false,
      isMentionableSelectMenu: () => false,
    });
    await flush();
    assert.deepEqual(h.calls, []);
  });

  test('logs a throwing handler without crashing the loop', async () => {
    const h = setup();
    const boom = handlerFor(h, 'boom', () => {
      throw new Error('nope');
    });
    h.discovery['slash'] = [{ ...boom, top: 'boom' }];
    h.routing.subscribe();
    const route = h.handlers.get(INTERACTION_CREATE)?.[0] as (i: unknown) => void;
    route({
      isChatInputCommand: () => true,
      isContextMenuCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => false,
      isAutocomplete: () => false,
      commandName: 'boom',
      options: { getSubcommandGroup: () => null, getSubcommand: () => null },
    });
    await flush();
    assert.deepEqual(h.calls, ['boom']);
  });
});
