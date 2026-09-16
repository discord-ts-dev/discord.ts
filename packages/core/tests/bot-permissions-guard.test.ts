import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { RequireBotPermissions } from '../src/guards/guards.decorator.js';
import { BotPermissionsGuard } from '../src/guards/bot-permissions.guard.js';

describe('BotPermissionsGuard', () => {
  test('blocks when the bot lacks a required perm', async () => {
    class Cmd {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Cmd.prototype, 'run');
    RequireBotPermissions('KickMembers')(Cmd.prototype, 'run', descriptor as PropertyDescriptor);
    const seen: unknown[] = [];
    const ix = {
      guild: { members: { me: { permissions: { has: () => false } } } },
      replied: false,
      deferred: false,
      reply: async (msg: unknown): Promise<unknown> => {
        seen.push(msg);
        return undefined;
      },
    };
    const guard = new BotPermissionsGuard();
    const ctx = DiscordExecutionContext.create([ix], Cmd.prototype.run, Cmd);
    assert.equal(await guard.canActivate(ctx), false);
    assert.match((seen[0] as { content: string }).content, /Bot is missing permissions/);
  });
});
