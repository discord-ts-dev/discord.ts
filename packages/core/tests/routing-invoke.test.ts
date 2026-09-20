import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { IsInt } from 'class-validator';
import { PARAM_OPTIONS_METADATA, StringOption, UseGuards, UsePipes } from '@discord.ts/common';
import type { Handler } from '../src/discovery/handler.types.js';
import { handlerFor, onMethod, setup, type Harness } from './routing-helpers.js';

describe('DiscordRoutingService pipes and guards', () => {
  function dtoHandler(h: Harness, name: string, Dto: object): Handler {
    const handler = handlerFor(h, name);
    const instance = handler.instance as Record<string, unknown>;
    Reflect.defineMetadata(PARAM_OPTIONS_METADATA, [0], instance[name] as object);
    Reflect.defineMetadata('design:paramtypes', [Dto], instance, name);
    return handler;
  }

  function invokeWith(h: Harness, handler: Handler, interaction: unknown): Promise<void> {
    return (
      h.routing as unknown as {
        invoke(h: Handler, interaction: unknown, raw: unknown[]): Promise<void>;
      }
    ).invoke(handler, interaction, [interaction]);
  }

  test('applies constructor pipes from the map and class pipes not in it', async () => {
    class MapPipe {
      transform(value: unknown): unknown {
        return `map:${String(value)}`;
      }
    }
    class NewPipe {
      transform(value: unknown): unknown {
        return `new:${String(value)}`;
      }
    }
    class Dto {}
    const h = setup({ pipes: new Map([[MapPipe, new MapPipe()]]) });
    const handler = dtoHandler(h, 'run', Dto);
    onMethod(handler, UsePipes(MapPipe));
    await invokeWith(h, handler, { options: {} });
    assert.match(String(h.seen[0]?.[0]), /^map:/);

    const h2 = setup();
    const handler2 = dtoHandler(h2, 'run', Dto);
    onMethod(handler2, UsePipes(NewPipe));
    await invokeWith(h2, handler2, { options: {} });
    assert.match(String(h2.seen[0]?.[0]), /^new:/);
  });

  test('blocks on a missing required option and replies ephemerally', async () => {
    const h = setup();
    class Dto {
      @StringOption({ name: 'q', description: 'Query', required: true })
      q?: string;
    }
    const handler = dtoHandler(h, 'run', Dto);
    const replies: unknown[] = [];
    const interaction = {
      options: { getString: () => null },
      reply: async (m: unknown) => void replies.push(m),
    };
    await invokeWith(h, handler, interaction);
    assert.deepEqual(h.calls, []);
    assert.match((replies[0] as { content: string }).content, /Missing required option "q"/);
    assert.equal((replies[0] as { flags?: number }).flags, MessageFlags.Ephemeral);
  });

  test('blocks on class-validator failures', async () => {
    const h = setup();
    class Dto {
      @StringOption({ name: 'n', description: 'n', required: false })
      @IsInt()
      n?: string;
    }
    const handler = dtoHandler(h, 'run', Dto);
    const replies: unknown[] = [];
    const interaction = {
      options: { getString: () => 'not-a-number' },
      reply: async (m: unknown) => void replies.push(m),
    };
    await invokeWith(h, handler, interaction);
    assert.deepEqual(h.calls, []);
    assert.match((replies[0] as { content: string }).content, /integer/);
    assert.equal((replies[0] as { flags?: number }).flags, MessageFlags.Ephemeral);
  });

  test('lets plain DTOs without validator decorators through', async () => {
    const h = setup();
    class Dto {
      @StringOption({ name: 'q', description: 'Query', required: false })
      q?: string;
    }
    const handler = dtoHandler(h, 'run', Dto);
    await invokeWith(h, handler, { options: { getString: () => 'term' } });
    assert.deepEqual(h.calls, ['run']);
  });

  test('treats a hostile DTO as valid instead of crashing', async () => {
    const h = setup();
    class Dto {
      @StringOption({ name: 'q', description: 'Query', required: false })
      q?: string;
    }
    class HostilePipe {
      transform(): unknown {
        return new Proxy(
          {},
          {
            get: (_t, key) => {
              if (key === 'constructor') throw new Error('hostile DTO');
              return undefined;
            },
          },
        );
      }
    }
    const handler = dtoHandler(h, 'run', Dto);
    onMethod(handler, UsePipes(HostilePipe));
    await invokeWith(h, handler, { options: {} });
    assert.deepEqual(h.calls, ['run']);
  });

  test('treats an unvalidatable DTO as valid', async () => {
    const h = setup();
    class Dto {
      @StringOption({ name: 'q', description: 'Query', required: false })
      q?: string;
    }
    const handler = dtoHandler(h, 'run', Dto);
    const throwing = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error('boom');
        },
      },
    );
    const interaction = { options: { getString: () => throwing } };
    await invokeWith(h, handler, interaction);
    assert.deepEqual(h.calls, ['run']);
  });

  test('skips pipes entirely without @Options', async () => {
    const h = setup();
    const handler = handlerFor(h, 'plain');
    await invokeWith(h, handler, {});
    assert.deepEqual(h.calls, ['plain']);
  });

  test('resolves guards missing from the map by constructing them', async () => {
    class BlockingGuard {
      canActivate(): boolean {
        return false;
      }
    }
    class PassingGuard {
      canActivate(): boolean {
        return true;
      }
    }
    const h = setup();
    const blocked = handlerFor(h, 'blocked');
    onMethod(blocked, UseGuards(BlockingGuard));
    await invokeWith(h, blocked, {});
    assert.deepEqual(h.calls, []);

    const allowed = handlerFor(h, 'allowed');
    onMethod(allowed, UseGuards(PassingGuard));
    await invokeWith(h, allowed, {});
    assert.deepEqual(h.calls, ['allowed']);
  });

  test('uses a configured guard instance as-is, carrying its constructor args', async () => {
    let allow = false;
    let calls = 0;
    const configured = {
      async canActivate(): Promise<boolean> {
        calls += 1;
        return allow;
      },
    };
    const h = setup();
    const handler = handlerFor(h, 'run');
    onMethod(handler, UseGuards(configured));
    await invokeWith(h, handler, {});
    assert.deepEqual(h.calls, []);
    assert.equal(calls, 1);
    allow = true;
    await invokeWith(h, handler, {});
    assert.deepEqual(h.calls, ['run']);
    assert.equal(calls, 2);
  });

  test('uses guard instances from the registry and honors replyError edge cases', async () => {
    const used: string[] = [];
    class MapGuard {
      canActivate(): boolean {
        used.push('map');
        return true;
      }
    }
    const h = setup({ guards: [MapGuard] });
    const handler = handlerFor(h, 'run');
    onMethod(handler, UseGuards(MapGuard));
    await invokeWith(h, handler, {});
    assert.deepEqual(used, ['map']);
    assert.deepEqual(h.calls, ['run']);

    const replies: unknown[] = [];
    const repliedIx = { replied: true, reply: async (m: unknown) => void replies.push(m) };
    await (
      h.routing as unknown as { replyError(ix: unknown, text: string): Promise<void> }
    ).replyError(repliedIx, 'nope');
    await (
      h.routing as unknown as { replyError(ix: unknown, text: string): Promise<void> }
    ).replyError({}, 'nope');
    await (
      h.routing as unknown as { replyError(ix: unknown, text: string): Promise<void> }
    ).replyError(
      {
        reply: async () => {
          throw new Error('gone');
        },
      },
      'nope',
    );
    assert.deepEqual(replies, []);
  });
});
