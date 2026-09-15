import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { pickOne } from '../src/index.js';

function fakeTarget(pick: string | null, userId: string): unknown {
  const msg = {
    createMessageComponentCollector: (_o: unknown): unknown => ({
      on: (event: string, fn: (c: unknown) => void): void => {
        if (event === 'collect' && pick !== null)
          fn({ values: [pick], user: { id: userId }, update: async () => undefined });
        if (event === 'end' && pick === null) fn(undefined);
      },
      stop: (): void => undefined,
    }),
  };
  return { reply: async (_m: unknown): Promise<unknown> => msg };
}

describe('pickOne', () => {
  test('resolves the picked value', async () => {
    const value = await pickOne(fakeTarget('b', 'u') as never, [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ]);
    assert.equal(value, 'b');
  });

  test('resolves null on timeout', async () => {
    const value = await pickOne(fakeTarget(null, 'u') as never, [{ label: 'A', value: 'a' }], {
      timeoutMs: 10,
    });
    assert.equal(value, null);
  });
});
