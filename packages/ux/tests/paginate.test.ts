import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { EmbedBuilder } from 'discord.js';
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

  test('single page replies on a prefix message', async () => {
    const { target, captured } = fakeTarget({ message: true });
    await paginate(target as never, [pages[0] as EmbedBuilder]);
    assert.equal(captured.replies.length, 1);
    assert.equal(captured.replies[0] && embedTitle(captured.replies[0]), 'Page 1');
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

  test('prefix message with multiple pages gets no fetchReply', async () => {
    const { target, captured } = fakeTarget({ message: true, plan: () => [] });
    await paginate(target as never, pages);
    assert.equal((captured.replies[0] as { fetchReply?: boolean }).fetchReply, undefined);
  });

  test('answered interaction edits the initial page', async () => {
    const { target, captured } = fakeTarget({ deferred: true, plan: () => [] });
    await paginate(target as never, pages);
    assert.equal(captured.edits.length, 1);
    assert.equal(embedTitle(captured.edits[0]), 'Page 1');
  });
});
