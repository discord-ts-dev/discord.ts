// ponytail: smoke test only, proves bun test wiring
import assert from 'node:assert';
import { describe, test } from 'node:test';
import * as ux from '../src/index';

describe('@discord.ts/ux', () => {
  test('exports module surface', () => {
    assert.equal(typeof ux, 'object');
  });
});
