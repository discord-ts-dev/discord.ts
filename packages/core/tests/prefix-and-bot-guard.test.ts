import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { StringOption, UserOption } from '@discord.ts/common';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { buildDtoFromArgs, splitSubroute } from '../src/discovery/discord-args.js';
import { RequireBotPermissions } from '../src/guards/guards.decorator.js';
import { BotPermissionsGuard } from '../src/guards/bot-permissions.guard.js';

class TargetReason {
  @UserOption({ name: 'target', description: 't', required: true })
  target!: string;

  @StringOption({ name: 'reason', description: 'r', required: false })
  reason?: string;
}

describe('prefix DTO and bot guard', () => {
  test('prefix DTO joins trailing words and coerces the mention', () => {
    const dto = buildDtoFromArgs(TargetReason as unknown as new () => Record<string, unknown>, [
      '<@123>',
      'spamming',
      'links',
    ]);
    assert.equal(dto.target, '123');
    assert.equal(dto.reason, 'spamming links');
  });

  test('BotPermissionsGuard blocks when the bot lacks a required perm', async () => {
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

describe('splitSubroute', () => {
  test('matches first token case-insensitively', () => {
    assert.deepEqual(splitSubroute(['rr', '2'], ['rr', 'lock']), { route: 'rr', rest: ['2'] });
    assert.deepEqual(splitSubroute(['LOCK'], ['rr', 'lock']), { route: 'lock', rest: [] });
  });

  test('no match or no args is null', () => {
    assert.equal(splitSubroute(['x'], ['rr']), null);
    assert.equal(splitSubroute([], ['rr']), null);
  });
});
