import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { isSnowflake, parseMentionId, userIdOf } from '../src/index.js';

describe('utils mentions', () => {
  test('parseMentionId coerces mentions and raw ids', () => {
    assert.equal(parseMentionId('<@123>'), '123');
    assert.equal(parseMentionId('<@!123>'), '123');
    assert.equal(parseMentionId('<@&456>'), '456');
    assert.equal(parseMentionId('<#789>'), '789');
    assert.equal(parseMentionId('123'), '123');
    assert.equal(parseMentionId('hello'), undefined);
    assert.equal(parseMentionId(undefined), undefined);
  });

  test('userIdOf resolves User objects and strings', () => {
    assert.equal(userIdOf({ id: '1' } as never), '1');
    assert.equal(userIdOf('<@!2>'), '2');
    assert.equal(userIdOf('nope'), undefined);
  });

  test('isSnowflake checks the 17-20 digit shape', () => {
    assert.equal(isSnowflake('123456789012345678'), true);
    assert.equal(isSnowflake('123'), false);
    assert.equal(isSnowflake(undefined), false);
  });
});
