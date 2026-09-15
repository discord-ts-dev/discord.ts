import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { COMMAND_METADATA, SlashCommand } from '../src/index.js';

describe('SlashCommand', () => {
  test('publishes name and description under the unified command key', () => {
    class Ping {
      run(): void {}
    }
    const meta = { name: 'ping', description: 'Reply with pong' };
    const descriptor = Object.getOwnPropertyDescriptor(Ping.prototype, 'run');
    SlashCommand(meta)(Ping.prototype, 'run', descriptor as PropertyDescriptor);
    assert.deepStrictEqual(Reflect.getMetadata(COMMAND_METADATA, Ping.prototype.run), {
      ...meta,
      slash: true,
      prefix: false,
    });
  });
});
