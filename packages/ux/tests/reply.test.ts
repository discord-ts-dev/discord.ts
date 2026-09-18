import { describe, expect, test } from 'bun:test';
import { MessageFlags, type ButtonInteraction, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral, type EphemeralReplyOptions, type EphemeralTarget } from '../src/reply.js';

function fakeTarget(overrides: Partial<EphemeralTarget> = {}): {
  target: EphemeralTarget;
  replies: EphemeralReplyOptions[];
} {
  const replies: EphemeralReplyOptions[] = [];
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

// Compile-time: real discord.js interactions satisfy the structural target,
// so app code can pass them without casts.
function _assertInteractionTypes(
  chatIx: ChatInputCommandInteraction,
  buttonIx: ButtonInteraction,
): void {
  const chatTarget: EphemeralTarget = chatIx;
  const buttonTarget: EphemeralTarget = buttonIx;
  void chatTarget;
  void buttonTarget;
}
void _assertInteractionTypes;

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
    await replyEphemeral({ replied: false, deferred: false }, 'nope');
    await replyEphemeral(null, 'nope');
    await replyEphemeral(undefined, 'nope');
    await replyEphemeral('interaction', 'nope');
    await replyEphemeral(42, 'nope');

    const { replies } = fakeTarget();
    await replyEphemeral({ replied: false, deferred: false }, 'nope');
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
