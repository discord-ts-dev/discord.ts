import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { pickOne } from '../src/index.js';
import { customIdsOf, fakeTarget } from './collector.js';

const options = [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
];

describe('pickOne', () => {
  test('resolves the menu value through the collector', async () => {
    const { target, captured } = fakeTarget({ plan: (ids) => [ids[0] as string] });
    const resolved = await pickOne(target as never, options);
    assert.equal(resolved, customIdsOf(captured.replies[0])[0] as string);
    assert.deepEqual(captured.updates, [{ components: [] }]);
  });

  test('resolves null on timeout', async () => {
    const { target } = fakeTarget({ plan: () => [], end: true });
    assert.equal(await pickOne(target as never, options, { timeoutMs: 10 }), null);
  });

  test('resolves null when delivery fails', async () => {
    const target = { reply: async () => null };
    assert.equal(await pickOne(target as never, options), null);
  });

  test('nudges a user outside allowedUserId and keeps waiting', async () => {
    const { target, captured } = fakeTarget({
      plan: (ids) => [ids[0] as string],
      user: 'someone-else',
      end: true,
    });
    assert.equal(await pickOne(target as never, options, { allowedUserId: 'u1' }), null);
    assert.deepEqual(captured.nudges, [
      { content: 'Not yours to pick.', flags: MessageFlags.Ephemeral, withResponse: true },
    ]);
  });

  test('accepts the allowed user', async () => {
    const { target } = fakeTarget({ plan: (ids) => [ids[0] as string] });
    assert.notEqual(await pickOne(target as never, options, { allowedUserId: 'u1' }), null);
  });

  test('uses config content and trims the option list to 25', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ label: `L${i}`, value: `v${i}` }));
    const { target, captured } = fakeTarget({ plan: () => [], end: true });
    await pickOne(target as never, many, { content: 'Pick one', placeholder: 'Choose' });
    const sent = captured.replies[0] as {
      content?: string;
      components?: Array<{
        components?: Array<{ options?: unknown[]; data?: { placeholder?: string } }>;
      }>;
    };
    assert.equal(sent.content, 'Pick one');
    const menu = sent.components?.[0]?.components?.[0];
    assert.equal(menu?.options?.length, 25);
    assert.equal(menu?.data?.placeholder, 'Choose');
  });

  test('swallows a failed update', async () => {
    const failing = {
      createMessageComponentCollector: (_o: unknown) => ({
        on: (event: string, fn: (arg: unknown) => void): void => {
          if (event === 'collect')
            fn({
              values: ['b'],
              user: { id: 'u1' },
              update: async () => {
                throw new Error('message gone');
              },
              reply: async () => undefined,
            });
        },
        stop: (): void => undefined,
      }),
    };
    const target = { reply: async () => failing };
    assert.equal(await pickOne(target as never, options), 'b');
  });

  test('resolves null when the component reports no value', async () => {
    const emptyValues = {
      createMessageComponentCollector: (_o: unknown) => ({
        on: (event: string, fn: (arg: unknown) => void): void => {
          if (event === 'collect')
            fn({
              values: [],
              user: { id: 'u1' },
              update: async () => undefined,
              reply: async () => undefined,
            });
        },
        stop: (): void => undefined,
      }),
    };
    const target = { reply: async () => emptyValues };
    assert.equal(await pickOne(target as never, options), null);
  });
});
