// ponytail: smoke test only, proves bun test wiring
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import * as common from '../src/index.js';

describe('@discord-ts-dev/common', () => {
  test('exports module surface', () => {
    assert.equal(typeof common, 'object');
  });
});
