import { describe, expect, test } from 'bun:test';
import { parseVotePayload } from '../src/index.js';

describe('parseVotePayload', () => {
  test('top.gg shape', () => {
    expect(parseVotePayload({ user: '123', type: 'upvote' })).toBe('123');
    expect(parseVotePayload({})).toBeNull();
    expect(parseVotePayload(null)).toBeNull();
    expect(parseVotePayload('junk')).toBeNull();
  });
});
