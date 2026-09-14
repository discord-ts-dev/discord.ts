import 'reflect-metadata';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { StringOption, UserOption } from '@discord.ts/common';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { buildDtoFromArgs, parseMentionId } from '../src/discovery/discord-args.js';
import { RequireBotPermissions } from '../src/guards/guards.decorator.js';
import { BotPermissionsGuard } from '../src/guards/bot-permissions.guard.js';
import { applyTimeout, bulkClear } from '../src/moderation.js';

class TargetReason {
  @UserOption({ name: 'target', description: 't', required: true })
  target!: string;

  @StringOption({ name: 'reason', description: 'r', required: false })
  reason?: string;
}

describe('moderation gaps', () => {
  test('parseMentionId coerces mentions and ids', () => {
    assert.equal(parseMentionId('<@123>'), '123');
    assert.equal(parseMentionId('<@!123>'), '123');
    assert.equal(parseMentionId('<@&456>'), '456');
    assert.equal(parseMentionId('<#789>'), '789');
    assert.equal(parseMentionId('123'), '123');
    assert.equal(parseMentionId('hello'), undefined);
  });

  test('prefix DTO joins trailing words and coerces the mention', () => {
    const dto = buildDtoFromArgs(TargetReason as unknown as new () => Record<string, unknown>, [
      '<@123>',
      'spamming',
      'links',
    ]);
    assert.equal(dto.target, '123');
    assert.equal(dto.reason, 'spamming links');
  });

  test('applyTimeout rejects out-of-range minutes before any fetch', async () => {
    await assert.rejects(applyTimeout({} as never, '1', 0, 'x'), /Timeout must be/);
    await assert.rejects(applyTimeout({} as never, '1', 40321, 'x'), /Timeout must be/);
  });

  test('bulkClear deletes by count without a filter', async () => {
    const channel = { bulkDelete: async (n: number) => ({ size: n }) };
    assert.equal(await bulkClear(channel, 5), 5);
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
