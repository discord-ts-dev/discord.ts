import assert from 'node:assert';
import { describe, test } from 'node:test';
import { formatTime, progressBar } from '../src/index.js';

describe('format helpers', () => {
  test('formatTime floors through s/m/h/d', () => {
    assert.equal(formatTime(90000), '1m 30s');
    assert.equal(formatTime(5000), '5s');
    assert.equal(formatTime(3_700_000), '1h 1m');
  });

  test('progressBar fills proportionally with percent', () => {
    assert.ok(progressBar(50, 100).includes('50%'));
    assert.ok(progressBar(0, 0).includes('0%'));
  });
});
