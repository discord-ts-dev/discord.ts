import assert from 'node:assert';
import { describe, test } from 'node:test';
import { SLASH_COMMAND_METADATA, SlashCommand } from '../src/index.js';

describe('SlashCommand', () => {
  test('publishes name and description under its metadata key', () => {
    class Ping {
      run(): void {}
    }
    const meta = { name: 'ping', description: 'Reply with pong' };
    const descriptor = Object.getOwnPropertyDescriptor(Ping.prototype, 'run');
    SlashCommand(meta)(Ping.prototype, 'run', descriptor as PropertyDescriptor);
    assert.deepStrictEqual(Reflect.getMetadata(SLASH_COMMAND_METADATA, Ping.prototype.run), meta);
  });
});
