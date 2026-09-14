import assert from 'node:assert';
import { describe, test } from 'node:test';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { Cooldown } from '../src/guards/guards.decorator.js';
import { CooldownGuard } from '../src/guards/cooldown.guard.js';

function fakeInteraction(userId: string, seen: unknown[]): Record<string, unknown> {
  return {
    user: { id: userId },
    replied: false,
    deferred: false,
    reply: async (msg: unknown): Promise<unknown> => {
      seen.push(msg);
      return undefined;
    },
  };
}

describe('Cooldown', () => {
  test('blocks a repeat call inside the window with an ephemeral reply', async () => {
    class Ping {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Ping.prototype, 'run');
    Cooldown(60)(Ping.prototype, 'run', descriptor as PropertyDescriptor);
    const seen: unknown[] = [];
    const guard = new CooldownGuard();
    const ctx = (ix: unknown): DiscordExecutionContext =>
      DiscordExecutionContext.create([ix], Ping.prototype.run, Ping);
    assert.equal(await guard.canActivate(ctx(fakeInteraction('u1', seen))), true);
    assert.equal(await guard.canActivate(ctx(fakeInteraction('u1', seen))), false);
    assert.deepStrictEqual(seen, [{ content: 'Slow down. Try again in 60s.', ephemeral: true }]);
  });
});
