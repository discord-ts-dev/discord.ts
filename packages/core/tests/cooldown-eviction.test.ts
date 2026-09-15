import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { COOLDOWN_METADATA } from '@discord.ts/common';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { CooldownGuard } from '../src/guards/cooldown.guard.js';

describe('CooldownGuard eviction', () => {
  test('evicts the oldest entry once the map is over capacity', async () => {
    const guard = new CooldownGuard();
    const fn = function handler(): void {};
    Reflect.defineMetadata(COOLDOWN_METADATA, 60, fn);
    const ctx = (userId: string) =>
      DiscordExecutionContext.create([{ user: { id: userId } }], fn, Object);

    await Promise.all(Array.from({ length: 5001 }, (_, i) => guard.canActivate(ctx(`u${i}`))));

    assert.equal(await guard.canActivate(ctx('u5000')), false);
    assert.equal(await guard.canActivate(ctx('u0')), true);
  });
});
