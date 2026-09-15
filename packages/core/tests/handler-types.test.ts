import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { matches, splitArgs } from '../src/discovery/handler.types.js';

describe('matches', () => {
  test('compares strings exactly', () => {
    assert.equal(matches('ping', 'ping'), true);
    assert.equal(matches('ping', 'pong'), false);
  });

  test('tests regular expressions', () => {
    assert.equal(matches(/^ping:/, 'ping:1'), true);
    assert.equal(matches(/^ping:/, 'pong:1'), false);
  });
});

describe('splitArgs', () => {
  test('splits on spaces and keeps quoted parts together', () => {
    assert.deepEqual(splitArgs('a b "c d" \'e f\''), ['a', 'b', 'c d', 'e f']);
    assert.deepEqual(splitArgs('  '), []);
  });
});
