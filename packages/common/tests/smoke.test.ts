// ponytail: smoke test only, proves bun test wiring
import assert from 'node:assert';
import { describe, test } from 'node:test';
import * as common from '../src/index';

describe('@discord.ts/common', () => {
  test('exports module surface', () => {
    assert.equal(typeof common, 'object');
  });
});
