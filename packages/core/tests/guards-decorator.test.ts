import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import {
  COOLDOWN_METADATA,
  GUARDS_METADATA,
  REQUIRED_BOT_PERMISSIONS_METADATA,
  REQUIRED_PERMISSIONS_METADATA,
} from '@discord.ts/common';
import {
  Cooldown,
  RequireBotPermissions,
  RequireGuild,
  RequireOwner,
  RequirePermissions,
  RequireVoice,
  SameVoice,
} from '../src/index.js';
import { BotPermissionsGuard } from '../src/guards/bot-permissions.guard.js';
import { CooldownGuard } from '../src/guards/cooldown.guard.js';
import { GuildGuard } from '../src/guards/guild.guard.js';
import { OwnerGuard } from '../src/guards/owner.guard.js';
import { PermissionsGuard } from '../src/guards/permissions.guard.js';
import { SameVoiceGuard, VoiceGuard } from '../src/guards/voice.guard.js';

const guardsOf = (target: object): unknown[] =>
  Reflect.getMetadata(GUARDS_METADATA, target) as unknown[];

describe('guard decorators', () => {
  test('Cooldown sets the metadata and the guard', () => {
    class Probe {}
    Cooldown(30)(Probe);
    assert.deepEqual(Reflect.getMetadata(COOLDOWN_METADATA, Probe), 30);
    assert.deepEqual(guardsOf(Probe), [CooldownGuard]);
  });

  test('RequirePermissions sets the metadata and the guard', () => {
    class Probe {}
    RequirePermissions('ManageGuild')(Probe);
    assert.deepEqual(Reflect.getMetadata(REQUIRED_PERMISSIONS_METADATA, Probe), ['ManageGuild']);
    assert.deepEqual(guardsOf(Probe), [PermissionsGuard]);
  });

  test('RequireBotPermissions sets the metadata and the guard', () => {
    class Probe {}
    RequireBotPermissions('ManageGuild')(Probe);
    assert.deepEqual(Reflect.getMetadata(REQUIRED_BOT_PERMISSIONS_METADATA, Probe), [
      'ManageGuild',
    ]);
    assert.deepEqual(guardsOf(Probe), [BotPermissionsGuard]);
  });

  test('single-guard decorators register their guard', () => {
    const cases: Array<[unknown, unknown]> = [
      [RequireGuild(), GuildGuard],
      [RequireOwner(), OwnerGuard],
      [RequireVoice(), VoiceGuard],
      [SameVoice(), SameVoiceGuard],
    ];
    for (const [decorator, guard] of cases) {
      class One {}
      (decorator as (t: object) => void)(One);
      assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, One), [guard]);
    }
  });
});
