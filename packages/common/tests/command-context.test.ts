import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { CommandContext, type CommandSource } from '../src/index.js';

interface Sent {
  payload: unknown;
  to: string;
}

function slashFake(overrides: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const calls = { typing: 0, defer: [] as Array<unknown> };
  const fake = {
    user: { id: 'u1' },
    member: { voice: { channelId: 'vc1' } },
    guild: { id: 'g1' },
    channel: { id: 'c1' },
    channelId: 'c1',
    client: { user: { id: 'bot' } },
    createdTimestamp: 42,
    replied: false,
    deferred: false,
    reply: async (payload: unknown) => {
      sent.push({ payload, to: 'reply' });
      fake.replied = true;
      return { id: 'm1' };
    },
    deferReply: async (opts: unknown) => {
      calls.defer.push(opts);
    },
    editReply: async (payload: unknown) => {
      sent.push({ payload, to: 'editReply' });
      return { id: 'm1' };
    },
    followUp: async (payload: unknown) => {
      sent.push({ payload, to: 'followUp' });
      return { id: 'm1' };
    },
    ...overrides,
  };
  return { fake, sent, calls };
}

function messageFake(overrides: Record<string, unknown> = {}) {
  const sent: Sent[] = [];
  const calls = { typing: 0, sendTypingThrows: false };
  const fake = {
    author: { id: 'u1' },
    member: { voice: { channelId: 'vc1' } },
    guild: { id: 'g1' },
    channel: {
      id: 'c1',
      sendTyping: async () => {
        calls.typing += 1;
        if (calls.sendTypingThrows) throw new Error('nope');
      },
    },
    channelId: 'c1',
    client: { user: { id: 'bot' } },
    createdTimestamp: 42,
    content: 'hello',
    reply: async (payload: unknown) => {
      sent.push({ payload, to: 'reply' });
      return { id: 'm1', edit: async (p: unknown) => sent.push({ payload: p, to: 'edit' }) };
    },
    ...overrides,
  };
  return { fake, sent, calls };
}

describe('CommandContext over a slash surface', () => {
  test('reads identity and flags', () => {
    const { fake } = slashFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    assert.equal(ctx.kind, 'slash');
    assert.equal(ctx.isSlash, true);
    assert.equal(ctx.user.id, 'u1');
    assert.equal(ctx.member?.voice?.channelId, 'vc1');
    assert.deepEqual(ctx.guild, { id: 'g1' });
    assert.equal(ctx.guildId, 'g1');
    assert.equal(ctx.channelId, 'c1');
    assert.deepEqual(ctx.channel, { id: 'c1' });
    assert.deepEqual(ctx.client.user, { id: 'bot' });
    assert.equal(ctx.createdTimestamp, 42);
    assert.equal(ctx.content, null);
    assert.equal(ctx.voiceChannelId, 'vc1');
    assert.equal(ctx.replied, false);
    assert.equal(ctx.deferred, false);
    assert.equal(ctx.unwrap(), fake as unknown as CommandSource);
  });

  test('member, guild and voiceChannelId are null when absent', () => {
    const { fake } = slashFake({ member: null, guild: null });
    const ctx = new CommandContext(fake as unknown as CommandSource);
    assert.equal(ctx.member, null);
    assert.equal(ctx.guild, null);
    assert.equal(ctx.guildId, null);
    assert.equal(ctx.voiceChannelId, null);
  });

  test('reply asks for fetchReply and records lastMessage', async () => {
    const { fake, sent } = slashFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    const msg = await ctx.reply('pong');
    assert.deepEqual(msg, { id: 'm1' });
    assert.deepEqual(sent, [{ payload: { content: 'pong', fetchReply: true }, to: 'reply' }]);
    assert.equal(ctx.replied, true);
  });

  test('reply routes to followUp once answered', async () => {
    const { fake, sent } = slashFake({ replied: true });
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.reply({ content: 'again' });
    assert.deepEqual(sent, [{ payload: { content: 'again' }, to: 'followUp' }]);
    assert.equal(ctx.replied, true);
  });

  test('deferred also counts as answered', async () => {
    const { fake, sent } = slashFake({ deferred: true });
    const ctx = new CommandContext(fake as unknown as CommandSource);
    assert.equal(ctx.replied, true);
    assert.equal(ctx.deferred, true);
    await ctx.reply('x');
    assert.equal(sent[0]?.to, 'followUp');
  });

  test('defer forwards the ephemeral flag', async () => {
    const { fake, calls } = slashFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.defer(true);
    assert.deepEqual(calls.defer, [{ ephemeral: true }]);
  });

  test('editReply and followUp reach the interaction', async () => {
    const { fake, sent } = slashFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.editReply({ embeds: [{ title: 't' }] });
    await ctx.followUp('extra');
    assert.deepEqual(sent, [
      { payload: { embeds: [{ title: 't' }] }, to: 'editReply' },
      { payload: { content: 'extra' }, to: 'followUp' },
    ]);
  });
});

describe('CommandContext over a prefix surface', () => {
  test('reads identity and flags', () => {
    const { fake } = messageFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    assert.equal(ctx.kind, 'prefix');
    assert.equal(ctx.isSlash, false);
    assert.equal(ctx.user.id, 'u1');
    assert.equal(ctx.guildId, 'g1');
    assert.equal(ctx.content, 'hello');
    assert.equal(ctx.replied, false);
    assert.equal(ctx.deferred, false);
    assert.equal(ctx.channelId, 'c1');
    assert.equal((ctx.channel as { id: string }).id, 'c1');
  });

  test('reply drops ephemeral and fetchReply instead of failing', async () => {
    const { fake, sent } = messageFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.reply({ content: 'pong', ephemeral: true, fetchReply: true } as never);
    assert.deepEqual(sent, [{ payload: { content: 'pong' }, to: 'reply' }]);
    assert.equal(ctx.replied, true);
  });

  test('defer sends typing and swallows failures', async () => {
    const { fake, calls } = messageFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.defer();
    assert.equal(calls.typing, 1);
    calls.sendTypingThrows = true;
    await ctx.defer(true);
    assert.equal(calls.typing, 2);
  });

  test('defer is a no-op when the channel is null', async () => {
    const { fake } = messageFake({ channel: null });
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.defer();
  });

  test('editReply edits the last reply, else replies', async () => {
    const { fake, sent } = messageFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.editReply('first');
    assert.equal(sent[0]?.to, 'reply');
    await ctx.editReply('second');
    assert.deepEqual(sent[1], { payload: { content: 'second' }, to: 'edit' });
  });

  test('followUp replies', async () => {
    const { fake, sent } = messageFake();
    const ctx = new CommandContext(fake as unknown as CommandSource);
    await ctx.followUp('extra');
    assert.deepEqual(sent, [{ payload: { content: 'extra' }, to: 'reply' }]);
  });
});
