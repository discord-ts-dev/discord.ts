import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { REQUIRED_PERMISSIONS_METADATA } from '@discord.ts/common';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { PermissionsGuard } from '../src/guards/permissions.guard.js';

function contextFor(ix: Record<string, unknown>, required?: unknown) {
  const fn = function handler(): void {};
  if (required !== undefined) Reflect.defineMetadata(REQUIRED_PERMISSIONS_METADATA, required, fn);
  return DiscordExecutionContext.create([ix], fn, class Probe {});
}

describe('PermissionsGuard', () => {
  test('passes when no permissions are required', async () => {
    assert.equal(await new PermissionsGuard().canActivate(contextFor({})), true);
  });

  test('passes when memberPermissions holds every permission', async () => {
    const ix = { memberPermissions: { has: () => true } };
    assert.equal(await new PermissionsGuard().canActivate(contextFor(ix, ['ManageGuild'])), true);
  });

  test('falls back to member.permissions', async () => {
    const ix = { member: { permissions: { has: () => true } } };
    assert.equal(await new PermissionsGuard().canActivate(contextFor(ix, ['ManageGuild'])), true);
  });

  test('blocks and replies ephemeral when permissions are missing', async () => {
    const replies: unknown[] = [];
    const ix = {
      memberPermissions: { has: () => false },
      reply: async (m: unknown) => replies.push(m),
    };
    assert.equal(await new PermissionsGuard().canActivate(contextFor(ix, ['ManageGuild'])), false);
    assert.match((replies[0] as { content: string }).content, /Missing permissions/);
    assert.equal((replies[0] as { flags?: number }).flags, MessageFlags.Ephemeral);
  });

  test('blocks without replying when already answered', async () => {
    const replies: unknown[] = [];
    const ix = {
      memberPermissions: { has: () => false, replied: true },
      replied: true,
      reply: async (m: unknown) => replies.push(m),
    };
    assert.equal(await new PermissionsGuard().canActivate(contextFor(ix, ['ManageGuild'])), false);
    assert.deepEqual(replies, []);
  });

  test('swallows a failing reply', async () => {
    const ix = {
      memberPermissions: { has: () => false },
      reply: async () => {
        throw new Error('gone');
      },
    };
    assert.equal(await new PermissionsGuard().canActivate(contextFor(ix, ['ManageGuild'])), false);
  });
});
