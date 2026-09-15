import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { errorEmbed } from '../src/index.js';

describe('errorEmbed', () => {
  test('red style with the given description', () => {
    const embed = errorEmbed('nope');
    assert.equal(embed.data.title, 'Something went wrong');
    assert.equal(embed.data.description, 'nope');
    assert.equal(embed.data.color, 0xed4245);
  });

  test('returns a fresh embed each call', () => {
    assert.notEqual(errorEmbed('a'), errorEmbed('a'));
  });
});
