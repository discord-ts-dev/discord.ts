import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { authorLock } from '../src/index.js';

function fakeIx(id: string, captured: unknown[]) {
  return {
    user: { id },
    reply: async (m: unknown) => {
      captured.push(m);
      return null;
    },
  };
}

describe('authorLock', () => {
  test('author passes without a nudge', async () => {
    const captured: unknown[] = [];
    const guard = authorLock(() => 'u1');
    assert.equal(await guard.canActivate(fakeIx('u1', captured)), true);
    assert.deepEqual(captured, []);
  });

  test('non-author is denied with the default nudge', async () => {
    const captured: unknown[] = [];
    const guard = authorLock(() => 'u1');
    assert.equal(await guard.canActivate(fakeIx('someone-else', captured)), false);
    assert.deepEqual(captured, [
      { content: 'Not yours to use.', flags: MessageFlags.Ephemeral, withResponse: true },
    ]);
  });

  test('unknown initiator passes through fail-open', async () => {
    const capturedNull: unknown[] = [];
    const guardNull = authorLock(() => null);
    assert.equal(await guardNull.canActivate(fakeIx('someone-else', capturedNull)), true);
    assert.deepEqual(capturedNull, []);

    const capturedUndef: unknown[] = [];
    const guardUndef = authorLock(() => undefined);
    assert.equal(await guardUndef.canActivate(fakeIx('someone-else', capturedUndef)), true);
    assert.deepEqual(capturedUndef, []);
  });

  test('deny override text is used', async () => {
    const captured: unknown[] = [];
    const guard = authorLock(() => 'u1', { deny: () => 'Custom nudge.' });
    assert.equal(await guard.canActivate(fakeIx('someone-else', captured)), false);
    assert.deepEqual(captured, [
      { content: 'Custom nudge.', flags: MessageFlags.Ephemeral, withResponse: true },
    ]);
  });

  test('unwraps DiscordExecutionContext shapes', async () => {
    const captured: unknown[] = [];
    const guard = authorLock((ix) => (ix as { user: { id: string } }).user.id);
    const ix = fakeIx('u1', captured);
    const viaInteraction = { getInteraction: () => ix };
    const viaArgIndex = { getArgByIndex: (i: number) => (i === 0 ? ix : undefined) };
    const viaContext = { getContext: () => ix };
    assert.equal(await guard.canActivate(viaInteraction), true);
    assert.equal(await guard.canActivate(viaArgIndex), true);
    assert.equal(await guard.canActivate(viaContext), true);
  });

  test('supports an async resolver', async () => {
    const captured: unknown[] = [];
    const guard = authorLock(async () => 'u1');
    assert.equal(await guard.canActivate(fakeIx('u1', captured)), true);
  });

  test('falls back to author.id and passes when no id is present', async () => {
    const capturedAuthor: unknown[] = [];
    const guardAuthor = authorLock(() => 'u1');
    const viaAuthor = {
      author: { id: 'u1' },
      reply: async (m: unknown) => {
        capturedAuthor.push(m);
        return null;
      },
    };
    assert.equal(await guardAuthor.canActivate(viaAuthor), true);

    const capturedNone: unknown[] = [];
    const guardNone = authorLock(() => 'u1');
    const noId = {
      reply: async (m: unknown) => {
        capturedNone.push(m);
        return null;
      },
    };
    assert.equal(await guardNone.canActivate(noId), true);
    assert.deepEqual(capturedNone, []);
  });
});
