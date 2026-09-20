import { describe, expect, test } from 'bun:test';
import { Command, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { EnabledGuard, MemoryStore, setCommandEnabled } from '../src/index.js';

// MessageFlags.Ephemeral without taking a discord.js dependency in systems.
const EPHEMERAL = 64;

class HuntLike {
  @Command({ name: 'hunt', description: 'Catch a wild animal' })
  async handle(): Promise<void> {}
}

const ShopLike = createCommandGroupDecorator({ name: 'shop', description: 'Paw shop' });

@ShopLike()
class ShopGroup {
  @Subcommand({ name: 'list', description: 'List shop items' })
  async handle(): Promise<void> {}
}

class Plain {
  async handle(): Promise<void> {}
}

function ctxFor(interaction: Record<string, unknown>, handler: object, cls: object): unknown {
  return {
    getArgByIndex: (i: number) => (i === 0 ? interaction : undefined),
    getHandler: () => handler,
    getClass: () => cls,
  };
}

describe('EnabledGuard', () => {
  test('allows commands by default', async () => {
    const guard = new EnabledGuard(new MemoryStore());
    const replies: unknown[] = [];
    const can = await guard.canActivate(
      ctxFor(
        { guild: { id: 'g1' }, reply: async (m: unknown) => replies.push(m) },
        HuntLike.prototype.handle,
        HuntLike,
      ),
    );
    expect(can).toBe(true);
    expect(replies).toHaveLength(0);
  });

  test('blocks a command disabled in this guild with the default message', async () => {
    const store = new MemoryStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const guard = new EnabledGuard(store);
    const replies: unknown[] = [];
    const can = await guard.canActivate(
      ctxFor(
        { guild: { id: 'g1' }, reply: async (m: unknown) => replies.push(m) },
        HuntLike.prototype.handle,
        HuntLike,
      ),
    );
    expect(can).toBe(false);
    expect(replies[0]).toEqual({
      content: '`/hunt` is disabled in this server.',
      flags: EPHEMERAL,
      withResponse: true,
    });
  });

  test('leaves other guilds and DMs alone', async () => {
    const store = new MemoryStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const guard = new EnabledGuard(store);
    expect(
      await guard.canActivate(
        ctxFor({ guild: { id: 'g2' }, reply: async () => {} }, HuntLike.prototype.handle, HuntLike),
      ),
    ).toBe(true);
    expect(
      await guard.canActivate(
        ctxFor({ guild: null, reply: async () => {} }, HuntLike.prototype.handle, HuntLike),
      ),
    ).toBe(true);
  });

  test('toggling a group name blocks its subcommands', async () => {
    const store = new MemoryStore();
    await setCommandEnabled(store, 'g1', 'shop', false);
    const guard = new EnabledGuard(store);
    expect(
      await guard.canActivate(
        ctxFor(
          { guild: { id: 'g1' }, reply: async () => {} },
          ShopGroup.prototype.handle,
          ShopGroup,
        ),
      ),
    ).toBe(false);
  });

  test('un-decorated handlers pass', async () => {
    const store = new MemoryStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const guard = new EnabledGuard(store);
    expect(
      await guard.canActivate(
        ctxFor({ guild: { id: 'g1' }, reply: async () => {} }, Plain.prototype.handle, Plain),
      ),
    ).toBe(true);
  });

  test('deny override receives the interaction and command name', async () => {
    const store = new MemoryStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const seen: unknown[] = [];
    const guard = new EnabledGuard(store, {
      deny: async (ix, name) => {
        seen.push([ix, name]);
        return `no ${name}`;
      },
    });
    const replies: unknown[] = [];
    const interaction = {
      guild: { id: 'g1' },
      reply: async (m: unknown) => replies.push(m),
    };
    const can = await guard.canActivate(ctxFor(interaction, HuntLike.prototype.handle, HuntLike));
    expect(can).toBe(false);
    expect(seen).toHaveLength(1);
    expect((seen[0] as unknown[])[0]).toBe(interaction);
    expect((seen[0] as unknown[])[1]).toBe('hunt');
    expect(replies[0]).toEqual({
      content: 'no hunt',
      flags: EPHEMERAL,
      withResponse: true,
    });
  });
});
