import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { initI18n } from '@discord.ts/i18n';
import { MessageFlags } from 'discord.js';
import { BannedGuard } from '../src/guards/player.guard.js';
import { banOf, banUser, bans, unbanUser } from '../src/game/bans.js';
import { FileStore } from '../src/game/store.js';

initI18n({ defaultLocale: 'en', languages: ['en'] }, join(import.meta.dir, '..'));

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('ban list', () => {
  test('ban, inspect, unban', async () => {
    const store = tempStore();
    expect(await banOf(store, '1')).toBeNull();
    await banUser(store, '1', 'spam');
    expect(await banOf(store, '1')).toMatchObject({ reason: 'spam' });
    expect(Object.keys(await bans(store))).toEqual(['1']);
    expect(await unbanUser(store, '1')).toBe(true);
    expect(await banOf(store, '1')).toBeNull();
    expect(await unbanUser(store, '1')).toBe(false);
  });
});

describe('BannedGuard', () => {
  const contextFor = (userId: string, reply: (m: unknown) => Promise<unknown>) => ({
    getArgByIndex: () => ({ user: { id: userId }, reply, replied: false, deferred: false }),
  });

  test('lets clean users through', async () => {
    const guard = new BannedGuard(tempStore());
    const can = await guard.canActivate(contextFor('1', async () => {}) as never);
    expect(can).toBe(true);
  });

  test('blocks banned users with the reason', async () => {
    const store = tempStore();
    await banUser(store, '1', 'spam');
    const guard = new BannedGuard(store);
    const replies: Array<Record<string, unknown>> = [];
    const can = await guard.canActivate(
      contextFor('1', async (m: unknown) => replies.push(m as Record<string, unknown>)) as never,
    );
    expect(can).toBe(false);
    expect(replies[0]?.['content']).toContain('spam');
    expect(replies[0]?.['flags']).toBe(MessageFlags.Ephemeral);
  });
});
