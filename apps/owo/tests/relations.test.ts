import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { accept, decline, divorce, propose, relation } from '../src/game/relations.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('propose', () => {
  test('records a pending proposal on the target', async () => {
    const store = tempStore();
    expect(await propose(store, 'a', 'b')).toEqual({ ok: true });
    expect(await relation(store, 'b')).toMatchObject({ spouse: null, pendingFrom: 'a' });
    expect((await relation(store, 'a')).spouse).toBeNull();
  });

  test('refuses self, taken targets, and double proposals', async () => {
    const store = tempStore();
    expect(await propose(store, 'a', 'a')).toEqual({ ok: false, reason: 'self' });
    await propose(store, 'a', 'b');
    expect(await propose(store, 'a', 'c')).toEqual({ ok: false, reason: 'already-pending' });
    await accept(store, 'b', 'a');
    expect(await propose(store, 'c', 'a')).toEqual({ ok: false, reason: 'target-married' });
    expect(await propose(store, 'a', 'c')).toEqual({ ok: false, reason: 'already-married' });
  });
});

describe('accept and decline', () => {
  test('accept weds both sides', async () => {
    const store = tempStore();
    await propose(store, 'a', 'b');
    expect(await accept(store, 'b', 'a')).toEqual({ ok: true });
    expect(await relation(store, 'a')).toMatchObject({
      spouse: 'b',
      pendingFrom: null,
      pendingTo: null,
    });
    expect(await relation(store, 'b')).toMatchObject({
      spouse: 'a',
      pendingFrom: null,
      pendingTo: null,
    });
  });

  test('accept needs the matching pending proposal', async () => {
    const store = tempStore();
    expect(await accept(store, 'b', 'a')).toEqual({ ok: false, reason: 'no-proposal' });
    await propose(store, 'a', 'b');
    expect(await accept(store, 'b', 'c')).toEqual({ ok: false, reason: 'no-proposal' });
  });

  test('accepting while your own proposal is out is blocked and keeps it intact', async () => {
    const store = tempStore();
    await propose(store, 'a', 'b');
    await propose(store, 'b', 'c');
    expect(await accept(store, 'b', 'a')).toEqual({ ok: false, reason: 'already-pending' });
    expect((await relation(store, 'a')).spouse).toBeNull();
    expect((await relation(store, 'b')).pendingTo).toBe('c');
    expect((await relation(store, 'c')).pendingFrom).toBe('b');
  });

  test('decline clears only the matching proposal', async () => {
    const store = tempStore();
    await propose(store, 'a', 'b');
    expect(await decline(store, 'b', 'c')).toEqual({ ok: false, reason: 'no-proposal' });
    expect(await decline(store, 'b', 'a')).toEqual({ ok: true });
    expect(await relation(store, 'b')).toMatchObject({ spouse: null, pendingFrom: null });
  });
});

describe('divorce', () => {
  test('clears both sides', async () => {
    const store = tempStore();
    await propose(store, 'a', 'b');
    await accept(store, 'b', 'a');
    expect(await divorce(store, 'a')).toEqual({ ok: true, former: 'b' });
    expect((await relation(store, 'a')).spouse).toBeNull();
    expect((await relation(store, 'b')).spouse).toBeNull();
  });

  test('refuses when single', async () => {
    const store = tempStore();
    expect(await divorce(store, 'a')).toEqual({ ok: false, reason: 'not-married' });
  });
});
