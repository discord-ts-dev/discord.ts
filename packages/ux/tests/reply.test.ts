import { describe, expect, test } from 'bun:test';
import {
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js';
import {
  deliver,
  replyEmbed,
  replyEphemeral,
  type ReplyPayload,
  type ReplyTarget,
} from '../src/reply.js';

interface Call {
  kind: 'reply' | 'editReply' | 'followUp';
  payload: ReplyPayload;
}

const MESSAGE = { id: 'm1' } as unknown as Message;

function fakeTarget(overrides: Partial<ReplyTarget> = {}): {
  target: ReplyTarget;
  calls: Call[];
} {
  const calls: Call[] = [];
  const target: ReplyTarget = {
    reply: async (payload) => {
      calls.push({ kind: 'reply', payload: payload as ReplyPayload });
      return { resource: { message: MESSAGE } };
    },
    editReply: async (payload) => {
      calls.push({ kind: 'editReply', payload: payload as ReplyPayload });
      return MESSAGE;
    },
    followUp: async (payload) => {
      calls.push({ kind: 'followUp', payload: payload as ReplyPayload });
      return MESSAGE;
    },
    replied: false,
    deferred: false,
    ...overrides,
  };
  return { target, calls };
}

// Compile-time: real discord.js interactions satisfy the structural target,
// so app code can pass them without casts.
function _assertInteractionTypes(
  chatIx: ChatInputCommandInteraction,
  buttonIx: ButtonInteraction,
): void {
  const chatTarget: ReplyTarget = chatIx;
  const buttonTarget: ReplyTarget = buttonIx;
  void chatTarget;
  void buttonTarget;
}
void _assertInteractionTypes;

describe('deliver', () => {
  test('replies with withResponse when the context is free', async () => {
    const { target, calls } = fakeTarget();
    const msg = await deliver(target, { content: 'hi' });
    expect(calls[0]?.payload).toEqual({ content: 'hi', withResponse: true });
    expect(msg).toBe(MESSAGE);
  });

  test('adds the ephemeral flag and reads the message out of the callback response', async () => {
    const { target, calls } = fakeTarget();
    const msg = await deliver(target, { content: 'hi' }, { ephemeral: true });
    expect(calls[0]?.payload).toEqual({
      content: 'hi',
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });
    expect(msg).toBe(MESSAGE);
  });

  test('edits when the context was already acknowledged', async () => {
    const { target, calls } = fakeTarget({ replied: true });
    const msg = await deliver(target, { content: 'done' });
    expect(calls).toEqual([{ kind: 'editReply', payload: { content: 'done' } }]);
    expect(msg).toBe(MESSAGE);
  });

  test('follows up when an acknowledged context needs an ephemeral reply', async () => {
    const { target, calls } = fakeTarget({ deferred: true });
    const msg = await deliver(target, { content: 'psst' }, { ephemeral: true });
    expect(calls).toEqual([
      { kind: 'followUp', payload: { content: 'psst', flags: MessageFlags.Ephemeral } },
    ]);
    expect(msg).toBe(MESSAGE);
  });

  test('returns null when the acknowledged path is missing a method', async () => {
    const noEdit = fakeTarget({ replied: true, editReply: undefined });
    expect(await deliver(noEdit.target, { content: 'x' })).toBeNull();
    expect(noEdit.calls).toHaveLength(0);

    const noFollow = fakeTarget({ replied: true, followUp: undefined });
    expect(await deliver(noFollow.target, { content: 'x' }, { ephemeral: true })).toBeNull();
    expect(noFollow.calls).toHaveLength(0);
  });

  test('returns null when a free context cannot reply', async () => {
    const onlyEdit = fakeTarget({ reply: undefined });
    expect(await deliver(onlyEdit.target, { content: 'x' })).toBeNull();
    expect(onlyEdit.calls).toHaveLength(0);
  });

  test('narrows unknown and un-repliable targets', async () => {
    expect(await deliver(null, { content: 'x' })).toBeNull();
    expect(await deliver('interaction', { content: 'x' })).toBeNull();
    expect(await deliver(42, { content: 'x' })).toBeNull();
    const { calls } = fakeTarget();
    expect(await deliver({ replied: false, deferred: false }, { content: 'x' })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test('returns the bare message when the target does not use withResponse', async () => {
    const bare = fakeTarget({ reply: async () => MESSAGE });
    expect(await deliver(bare.target, { content: 'x' })).toBe(MESSAGE);
  });

  test('returns null when the callback response carries no message', async () => {
    const empty = fakeTarget({ reply: async () => ({ resource: { message: null } }) });
    expect(await deliver(empty.target, { content: 'x' })).toBeNull();
    const undefinedResult = fakeTarget({ reply: async () => undefined });
    expect(await deliver(undefinedResult.target, { content: 'x' })).toBeNull();
  });

  test('swallows a failed delivery', async () => {
    const failing = fakeTarget({
      reply: async () => {
        throw new Error('gone');
      },
    });
    expect(await deliver(failing.target, { content: 'x' })).toBeNull();
  });
});

describe('replyEphemeral', () => {
  test('replies ephemerally when free', async () => {
    const { target, calls } = fakeTarget();
    await replyEphemeral(target, 'nope');
    expect(calls[0]?.payload).toEqual({
      content: 'nope',
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });
  });

  test('follows up instead of dropping the message when acknowledged', async () => {
    const { target, calls } = fakeTarget({ replied: true });
    await replyEphemeral(target, 'nope');
    expect(calls).toEqual([
      { kind: 'followUp', payload: { content: 'nope', flags: MessageFlags.Ephemeral } },
    ]);
  });
});

describe('replyEmbed', () => {
  test('edits with an embed when acknowledged', async () => {
    const embed = new EmbedBuilder().setTitle('Done');
    const { target, calls } = fakeTarget({ replied: true });
    await replyEmbed(target, embed);
    expect(calls[0]?.kind).toBe('editReply');
    expect(calls[0]?.payload['embeds']).toEqual([embed]);
  });

  test('replies ephemerally with an embed when asked', async () => {
    const embed = new EmbedBuilder().setTitle('Nope');
    const { target, calls } = fakeTarget();
    await replyEmbed(target, embed, true);
    expect(calls[0]?.kind).toBe('reply');
    expect(calls[0]?.payload['flags']).toBe(MessageFlags.Ephemeral);
  });
});
