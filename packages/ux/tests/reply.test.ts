import { describe, expect, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { replyEphemeral, type EphemeralTarget } from '../src/reply.js';

function fakeTarget(overrides: Partial<EphemeralTarget> = {}): {
  target: EphemeralTarget;
  replies: Array<{ content: string; flags: number }>;
} {
  const replies: Array<{ content: string; flags: number }> = [];
  const target: EphemeralTarget = {
    reply: async (options) => {
      replies.push(options);
      return {};
    },
    replied: false,
    deferred: false,
    ...overrides,
  };
  return { target, replies };
}

describe('replyEphemeral', () => {
  test('sends an ephemeral reply', async () => {
    const { target, replies } = fakeTarget();
    await replyEphemeral(target, 'nope');
    expect(replies).toEqual([{ content: 'nope', flags: MessageFlags.Ephemeral }]);
  });

  test('stays quiet when the handler already replied or deferred', async () => {
    const replied = fakeTarget({ replied: true });
    await replyEphemeral(replied.target, 'nope');
    expect(replied.replies).toHaveLength(0);

    const deferred = fakeTarget({ deferred: true });
    await replyEphemeral(deferred.target, 'nope');
    expect(deferred.replies).toHaveLength(0);
  });

  test('does nothing when the target cannot reply', async () => {
    const { target, replies } = fakeTarget({ reply: undefined });
    await replyEphemeral(target, 'nope');
    expect(replies).toHaveLength(0);
  });

  test('swallows a failed reply so the original block still stands', async () => {
    const { target, replies } = fakeTarget({
      reply: async () => {
        throw new Error('unknown interaction');
      },
    });
    await replyEphemeral(target, 'nope');
    expect(replies).toHaveLength(0);
  });
});
