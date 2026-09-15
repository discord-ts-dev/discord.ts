import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { RequireOwner } from '../src/guards/guards.decorator.js';
import { OwnerGuard } from '../src/guards/owner.guard.js';

function fakeSource(authorId: string, seen: unknown[]): Record<string, unknown> {
  return {
    user: { id: authorId },
    replied: false,
    deferred: false,
    reply: async (msg: unknown): Promise<unknown> => {
      seen.push(msg);
      return undefined;
    },
  };
}

describe('RequireOwner', () => {
  test('allows listed owners, denies everyone else fail-closed', async () => {
    class Cmd {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Cmd.prototype, 'run');
    RequireOwner()(Cmd.prototype, 'run', descriptor as PropertyDescriptor);
    const guard = new OwnerGuard(['1']);
    const allowed = DiscordExecutionContext.create([fakeSource('1', [])], Cmd.prototype.run, Cmd);
    assert.equal(await guard.canActivate(allowed), true);
    const seen: unknown[] = [];
    const denied = DiscordExecutionContext.create([fakeSource('2', seen)], Cmd.prototype.run, Cmd);
    assert.equal(await guard.canActivate(denied), false);
    assert.match((seen[0] as { content: string }).content, /Owner only/);
    const empty = new OwnerGuard();
    assert.equal(await guard.canActivate(denied), false);
    assert.equal(
      await empty.canActivate(
        DiscordExecutionContext.create([fakeSource('1', [])], Cmd.prototype.run, Cmd),
      ),
      false,
    );
  });
});
