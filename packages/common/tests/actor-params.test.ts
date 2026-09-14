import assert from 'node:assert';
import { describe, test } from 'node:test';
import { PARAM_AUTHOR_METADATA, PARAM_GUILD_METADATA, Author, Guild } from '../src/index.js';

describe('Guild/Author', () => {
  test('record param indexes like Context and Options do', () => {
    class Cmd {
      run(_guild: unknown, _author: unknown): void {}
    }
    Guild()(Cmd.prototype, 'run', 0);
    Author()(Cmd.prototype, 'run', 1);
    Guild()(Cmd.prototype, 'run', 2);
    assert.deepStrictEqual(Reflect.getMetadata(PARAM_GUILD_METADATA, Cmd.prototype.run), [0, 2]);
    assert.deepStrictEqual(Reflect.getMetadata(PARAM_AUTHOR_METADATA, Cmd.prototype.run), [1]);
  });
});
