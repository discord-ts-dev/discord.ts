import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { MessageFlags } from 'discord.js';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { RequireGuild } from '../src/guards/guards.decorator.js';
import { GuildGuard } from '../src/guards/guild.guard.js';

function fakeSource(guild: unknown, seen: unknown[]): Record<string, unknown> {
  return {
    guild,
    replied: false,
    deferred: false,
    reply: async (msg: unknown): Promise<unknown> => {
      seen.push(msg);
      return undefined;
    },
  };
}

describe('RequireGuild', () => {
  test('passes inside a guild and replies ephemeral in DMs', async () => {
    class Cmd {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Cmd.prototype, 'run');
    RequireGuild()(Cmd.prototype, 'run', descriptor as PropertyDescriptor);
    const guard = new GuildGuard();
    const inside = DiscordExecutionContext.create(
      [fakeSource({ id: 'g' }, [])],
      Cmd.prototype.run,
      Cmd,
    );
    assert.equal(await guard.canActivate(inside), true);
    const seen: unknown[] = [];
    const outside = DiscordExecutionContext.create(
      [fakeSource(null, seen)],
      Cmd.prototype.run,
      Cmd,
    );
    assert.equal(await guard.canActivate(outside), false);
    assert.match((seen[0] as { content: string }).content, /server/);
    assert.equal((seen[0] as { flags: number }).flags, MessageFlags.Ephemeral);
  });
});
