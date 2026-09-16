import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { initI18n } from '@discord.ts/i18n';
import { MessageFlags } from 'discord.js';
import { Command, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { DiscordExecutionContext } from '@discord.ts/core';
import { setCommandEnabled } from '@discord.ts/systems';
import { EnabledGuard } from '../src/guards/enabled.guard.js';
import { FileStore } from '../src/game/store.js';

initI18n({ defaultLocale: 'en', languages: ['en'] }, join(import.meta.dir, '..'));

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

function contextFor(interaction: Record<string, unknown>): DiscordExecutionContext {
  return DiscordExecutionContext.create([interaction], HuntLike.prototype.handle, HuntLike);
}

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('EnabledGuard', () => {
  test('allows commands by default', async () => {
    const guard = new EnabledGuard(tempStore());
    const replies: unknown[] = [];
    const can = await guard.canActivate(
      contextFor({ guild: { id: 'g1' }, reply: async (m: unknown) => replies.push(m) }),
    );
    expect(can).toBe(true);
    expect(replies).toHaveLength(0);
  });

  test('blocks a command disabled in this guild and replies ephemeral', async () => {
    const store = tempStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const guard = new EnabledGuard(store);
    const replies: unknown[] = [];
    const can = await guard.canActivate(
      contextFor({ guild: { id: 'g1' }, reply: async (m: unknown) => replies.push(m) }),
    );
    expect(can).toBe(false);
    expect(replies[0]).toEqual({
      content: expect.stringContaining('disabled'),
      flags: MessageFlags.Ephemeral,
    });
  });

  test('leaves other guilds and DMs alone', async () => {
    const store = tempStore();
    await setCommandEnabled(store, 'g1', 'hunt', false);
    const guard = new EnabledGuard(store);
    expect(
      await guard.canActivate(contextFor({ guild: { id: 'g2' }, reply: async () => {} })),
    ).toBe(true);
    expect(await guard.canActivate(contextFor({ guild: null, reply: async () => {} }))).toBe(true);
  });

  test('toggling a group name blocks its subcommands', async () => {
    const store = tempStore();
    await setCommandEnabled(store, 'g1', 'shop', false);
    const guard = new EnabledGuard(store);
    const context = DiscordExecutionContext.create(
      [{ guild: { id: 'g1' }, reply: async () => {} }],
      ShopGroup.prototype.handle,
      ShopGroup,
    );
    expect(await guard.canActivate(context)).toBe(false);
  });
});
