import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { CommandContext, Context } from '@discord.ts/common';
import { buildArgs } from '../src/discovery/discord-args.js';
import type { Handler } from '../src/discovery/handler.types.js';

class Raw {
  run(_ctx: unknown): void {}
}
Context()(Raw.prototype, 'run', 0);
Reflect.defineMetadata('design:paramtypes', [Object], Raw.prototype, 'run');

class Unified {
  run(_ctx: unknown): void {}
}
Context()(Unified.prototype, 'run', 0);
Reflect.defineMetadata('design:paramtypes', [CommandContext], Unified.prototype, 'run');

const rawHandler = (): Handler => ({ instance: new Raw() as never, method: 'run' });
const unifiedHandler = (): Handler => ({ instance: new Unified() as never, method: 'run' });

const slash = (over: Record<string, unknown> = {}) => ({
  user: { id: 'u' },
  member: { voice: { channelId: 'v1' } },
  guild: { id: 'g' },
  channel: { id: 'c' },
  channelId: 'c',
  client: {},
  createdTimestamp: 1,
  replied: false,
  deferred: false,
  reply: async (p: unknown) => ({ id: 'm', payload: p }),
  followUp: async (p: unknown) => ({ id: 'f', payload: p }),
  ...over,
});

const prefix = (over: Record<string, unknown> = {}) => ({
  author: { id: 'a' },
  content: 'hi',
  member: { voice: { channelId: null } },
  guild: { id: 'g' },
  channel: {},
  channelId: 'c',
  client: {},
  createdTimestamp: 2,
  reply: async (p: unknown) => ({ id: 'm2', payload: p }),
  ...over,
});

describe('CommandContext injection', () => {
  test('raw union passes through untouched', () => {
    const ix = slash();
    const args = buildArgs(rawHandler(), ix);
    assert.strictEqual(args[0], ix);
  });

  test('slash wraps; reply uses interaction.reply with fetchReply', async () => {
    let got: Record<string, unknown> = {};
    const ix = slash({ reply: async (p: unknown) => ((got = p as never), { id: 'm' }) });
    const [ctx] = buildArgs(unifiedHandler(), ix) as [CommandContext];
    assert.ok(ctx instanceof CommandContext);
    assert.equal(ctx.kind, 'slash');
    assert.equal(ctx.user.id, 'u');
    assert.equal(ctx.voiceChannelId, 'v1');
    const msg = (await ctx.reply({ ephemeral: true })) as unknown as Record<string, unknown>;
    assert.equal(msg.id, 'm');
    assert.equal(got.fetchReply, true);
    assert.equal(ctx.unwrap(), ix);
  });

  test('already-replied routes reply to followUp', async () => {
    let followed = false;
    const ix = slash({
      replied: true,
      followUp: async () => ((followed = true), { id: 'f' }),
    });
    const [ctx] = buildArgs(unifiedHandler(), ix) as [CommandContext];
    await ctx.reply('again');
    assert.equal(followed, true);
  });

  test('prefix wraps; ephemeral dropped', async () => {
    let got: Record<string, unknown> = {};
    const m = prefix({ reply: async (p: unknown) => ((got = p as never), { id: 'm2' }) });
    const [ctx] = buildArgs(unifiedHandler(), m) as [CommandContext];
    assert.equal(ctx.kind, 'prefix');
    assert.equal(ctx.user.id, 'a');
    assert.equal(ctx.content, 'hi');
    await ctx.reply({ content: 'x', ephemeral: true });
    assert.equal('ephemeral' in got, false);
  });
});
