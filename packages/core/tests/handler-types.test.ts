import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { matches } from '../src/discovery/handler.types.js';

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
