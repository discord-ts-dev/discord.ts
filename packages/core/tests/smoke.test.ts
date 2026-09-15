// ponytail: smoke test only, proves bun test wiring
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import * as core from '../src/index.js';

describe('@discord.ts/core', () => {
  test('exports module surface', () => {
    assert.equal(typeof core, 'object');
  });
});
