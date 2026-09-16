import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { FileStore } from '../src/game/store.js';
import { knownUsers, rememberUser } from '../src/game/users.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('user index', () => {
  test('evicts the oldest beyond the cap and skips duplicates', async () => {
    const store = tempStore();
    await rememberUser(store, 'a', 2);
    await rememberUser(store, 'b', 2);
    await rememberUser(store, 'c', 2);
    expect(await knownUsers(store)).toEqual(['b', 'c']);
    await rememberUser(store, 'c', 2);
    expect(await knownUsers(store)).toEqual(['b', 'c']);
  });

  test('starts empty', async () => {
    expect(await knownUsers(tempStore())).toEqual([]);
  });
});
