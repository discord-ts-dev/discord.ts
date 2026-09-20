import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { paginate } from '../src/index.js';
import { fakeTarget } from './collector.js';

const pages = [1, 2, 3].map((n) => new EmbedBuilder().setTitle(`Page ${n}`));

const embedTitle = (payload: unknown): unknown =>
  (payload as { embeds?: Array<{ data: { title?: string } }> }).embeds?.[0]?.data.title;

describe('paginate', () => {
  test('returns without sending when there are no pages', async () => {
    const { target, captured } = fakeTarget();
    await paginate(target as never, []);
    assert.deepEqual(captured.replies, []);
  });

  test('sends the only page directly, no collector', async () => {
    const { target, captured } = fakeTarget();
    await paginate(target as never, [pages[0] as EmbedBuilder]);
    assert.equal(captured.replies.length, 1);
    assert.equal(embedTitle(captured.replies[0]), 'Page 1');
    assert.equal((captured.replies[0] as { components?: unknown[] }).components, undefined);
  });

  test('single page edits when the interaction was answered', async () => {
    const { target, captured } = fakeTarget({ replied: true });
    await paginate(target as never, [pages[0] as EmbedBuilder]);
    assert.equal(captured.edits.length, 1);
  });

  test('multi-page starts on page 1 and cycles with next/prev', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[1] as string, ids[1] as string, ids[0] as string],
    });
    await paginate(target as never, pages);
    assert.equal(captured.replies.length, 1);
    assert.equal(embedTitle(captured.replies[0]), 'Page 1');
    assert.deepEqual(
      captured.updates.map((u) => embedTitle(u)),
      ['Page 2', 'Page 3', 'Page 2'],
    );
  });

  test('next wraps around at the end', async () => {
    const wrapped = fakeTarget({
      plan: (ids) => [ids[1] as string, ids[1] as string, ids[1] as string],
    });
    await paginate(wrapped.target as never, pages);
    assert.deepEqual(
      wrapped.captured.updates.map((u) => embedTitle(u)),
      ['Page 2', 'Page 3', 'Page 1'],
    );
  });

  test('ignores unknown customIds', async () => {
    const { target, captured } = fakeTarget({ plan: () => ['discord-ts:confirm:yes:x'] });
    await paginate(target as never, pages);
    assert.deepEqual(captured.updates, []);
  });

  test('returns without a collector when delivery fails', async () => {
    const target = { reply: async () => null };
    await paginate(target as never, pages);
  });

  test('answered interaction edits the initial page', async () => {
    const { target, captured } = fakeTarget({ deferred: true, plan: () => [] });
    await paginate(target as never, pages);
    assert.equal(captured.edits.length, 1);
    assert.equal(embedTitle(captured.edits[0]), 'Page 1');
  });

  test('nudges a user outside allowedUserId and ignores the page turn', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[1] as string],
      user: 'someone-else',
    });
    await paginate(target as never, pages, { allowedUserId: 'u1' });
    assert.deepEqual(captured.updates, []);
    assert.deepEqual(captured.nudges, [
      { content: 'Not yours to page.', flags: MessageFlags.Ephemeral, withResponse: true },
    ]);
  });

  test('accepts the allowed user', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[1] as string],
    });
    await paginate(target as never, pages, { allowedUserId: 'u1' });
    assert.deepEqual(
      captured.updates.map((u) => embedTitle(u)),
      ['Page 2'],
    );
  });

  test('accepts object timeoutMs', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[1] as string],
    });
    await paginate(target as never, pages, { timeoutMs: 60_000 });
    assert.deepEqual(
      captured.updates.map((u) => embedTitle(u)),
      ['Page 2'],
    );
  });
});
