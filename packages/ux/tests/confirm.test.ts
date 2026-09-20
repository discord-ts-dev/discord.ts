import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { confirm } from '../src/index.js';
import { fakeTarget } from './collector.js';

describe('confirm', () => {
  test('resolves true on Confirm and updates the message', async () => {
    const { target, captured } = fakeTarget({ plan: (ids) => [ids[0] as string] });
    assert.equal(await confirm(target as never, 'Delete?'), true);
    assert.equal(captured.replies.length, 1);
    assert.deepEqual(captured.updates, [{ content: 'Confirmed.', components: [] }]);
  });

  test('resolves false on Cancel', async () => {
    const { target, captured } = fakeTarget({ plan: (ids) => [ids[1] as string] });
    assert.equal(await confirm(target as never, 'Delete?'), false);
    assert.deepEqual(captured.updates, [{ content: 'Cancelled.', components: [] }]);
  });

  test('resolves false on timeout', async () => {
    const { target } = fakeTarget({ plan: () => [], end: true });
    assert.equal(await confirm(target as never, 'Delete?'), false);
  });

  test('ignores unknown customIds', async () => {
    const { target } = fakeTarget({ plan: () => ['someone-elses'], end: true });
    assert.equal(await confirm(target as never, 'Delete?'), false);
  });

  test('collects nothing when no plan is given', async () => {
    const { target } = fakeTarget({ end: true });
    assert.equal(await confirm(target as never, 'Delete?'), false);
  });

  test('accepts an embed payload', async () => {
    const { target, captured } = fakeTarget({ plan: (ids) => [ids[0] as string] });
    const embed = new EmbedBuilder().setTitle('Sure?');
    assert.equal(await confirm(target as never, { embeds: [embed] }), true);
    const sent = captured.replies[0] as { embeds?: unknown[]; components?: unknown[] };
    assert.deepEqual(sent.embeds, [embed]);
    assert.equal(sent.components?.length, 1);
  });

  test('edits the reply when the interaction was already answered', async () => {
    const { target, captured } = fakeTarget({ replied: true, plan: (ids) => [ids[0] as string] });
    assert.equal(await confirm(target as never, 'Delete?'), true);
    assert.equal(captured.replies.length, 0);
    assert.equal(captured.edits.length, 1);
  });

  test('defers still routes through editReply', async () => {
    const { target, captured } = fakeTarget({ deferred: true, plan: (ids) => [ids[1] as string] });
    assert.equal(await confirm(target as never, 'Delete?'), false);
    assert.equal(captured.edits.length, 1);
  });

  test('a fresh interaction replies with withResponse', async () => {
    const { target, captured } = fakeTarget({ plan: () => [], end: true });
    await confirm(target as never, 'Delete?');
    const sent = captured.replies[0] as { withResponse?: boolean };
    assert.equal(sent.withResponse, true);
  });

  test('resolves false when delivery fails', async () => {
    const target = { reply: async () => null };
    assert.equal(await confirm(target as never, 'Delete?'), false);
  });

  test('nudges a user outside allowedUserId and keeps waiting', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[0] as string],
      user: 'someone-else',
      end: true,
    });
    assert.equal(await confirm(target as never, 'Delete?', { allowedUserId: 'u1' }), false);
    assert.deepEqual(captured.nudges, [
      { content: 'Not yours to confirm.', flags: MessageFlags.Ephemeral, withResponse: true },
    ]);
  });

  test('accepts the allowed user', async () => {
    const { target } = fakeTarget({ plan: (ids) => [ids[0] as string] });
    assert.equal(await confirm(target as never, 'Delete?', { allowedUserId: 'u1' }), true);
  });

  test('accepts object timeoutMs', async () => {
    const { target } = fakeTarget({ plan: () => [], end: true });
    assert.equal(await confirm(target as never, 'Delete?', { timeoutMs: 10 }), false);
  });
});
