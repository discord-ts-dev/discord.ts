import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';

describe('DiscordExecutionContext', () => {
  test('exposes args, handler and class', () => {
    const fn = function handler(): void {};
    class Probe {}
    const ctx = DiscordExecutionContext.create(['a', 'b'], fn, Probe);
    assert.equal(ctx.getHandler(), fn);
    assert.equal(ctx.getClass(), Probe);
    assert.equal(ctx.getArgByIndex(1), 'b');
    assert.deepEqual(ctx.getArgs(), ['a', 'b']);
    assert.equal(ctx.getInteraction(), 'a');
    assert.equal(ctx.getContext(), 'a');
  });

  test('create fills in noop defaults', () => {
    const ctx = DiscordExecutionContext.create([]);
    assert.equal(typeof ctx.getHandler(), 'function');
    assert.equal(ctx.getHandler()(), undefined);
    assert.equal(ctx.getClass(), Object);
    assert.equal(ctx.getArgByIndex(0), undefined);
  });
});
