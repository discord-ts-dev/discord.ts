import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { PARAM_PREFIX_ARGS_METADATA } from '@discord.ts/common';
import { MESSAGE_CREATE, flush, handlerFor, setup } from './routing-helpers.js';

describe('DiscordRoutingService.routePrefix', () => {
  function prefixMessage(content: string, bot = false) {
    return {
      author: { bot },
      content,
      guild: null,
      user: { id: 'u' },
      reply: async () => undefined,
    };
  }

  test('ignores bots, unknown prefixes and unknown commands', async () => {
    const h = setup();
    h.discovery['prefix'] = [{ ...handlerFor(h, 'echo'), name: 'echo', aliases: [] }];
    h.routing.subscribe();
    const route = h.handlers.get(MESSAGE_CREATE)?.[0] as (m: unknown) => void;
    route(prefixMessage('!echo hi', true));
    route(prefixMessage('plain text'));
    route(prefixMessage('!missing'));
    await flush();
    assert.deepEqual(h.calls, []);
  });

  test('routes the bare handler and sub-routes with sliced args', async () => {
    const h = setup();
    const bare = handlerFor(h, 'bare');
    const rr = handlerFor(h, 'rr');
    Reflect.defineMetadata(PARAM_PREFIX_ARGS_METADATA, [0], bare.instance['bare'] as object);
    Reflect.defineMetadata(PARAM_PREFIX_ARGS_METADATA, [0], rr.instance['rr'] as object);
    Reflect.defineMetadata('design:paramtypes', [Array], bare.instance, 'bare');
    Reflect.defineMetadata('design:paramtypes', [Array], rr.instance, 'rr');
    h.discovery['prefix'] = [
      { ...bare, name: 'echo', aliases: ['e'] },
      { ...rr, name: 'quest', aliases: [], sub: 'reroll' },
    ];
    h.routing.subscribe();
    const route = h.handlers.get(MESSAGE_CREATE)?.[0] as (m: unknown) => void;

    route(prefixMessage('!e hello world'));
    await flush();
    assert.deepEqual(h.calls, ['bare']);
    assert.deepEqual(h.seen[0]?.[0], ['hello', 'world']);

    route(prefixMessage('!quest reroll 2'));
    await flush();
    assert.deepEqual(h.calls, ['bare', 'rr']);
    assert.deepEqual(h.seen[1]?.[0], ['2']);

    route(prefixMessage('!quest'));
    await flush();
    assert.deepEqual(h.calls, ['bare', 'rr']);

    route(prefixMessage('!'));
    await flush();
    assert.deepEqual(h.calls, ['bare', 'rr']);
  });
});
