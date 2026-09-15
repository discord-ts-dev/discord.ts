import assert from 'node:assert';
import { describe, test } from 'node:test';
import { DiscordExecutionContext } from '../src/context/discord-execution-context.js';
import { RequireVoice, SameVoice } from '../src/guards/guards.decorator.js';
import { SameVoiceGuard, VoiceGuard } from '../src/guards/voice.guard.js';

function fakeSource(
  memberChannel: string | null,
  botChannel: string | null,
  seen: unknown[],
): Record<string, unknown> {
  return {
    member: { voice: { channelId: memberChannel } },
    guild: { members: { me: { voice: { channelId: botChannel } } } },
    replied: false,
    deferred: false,
    reply: async (msg: unknown): Promise<unknown> => {
      seen.push(msg);
      return undefined;
    },
  };
}

function contextOf(source: Record<string, unknown>): DiscordExecutionContext {
  class Cmd {
    run(): void {}
  }
  return DiscordExecutionContext.create([source], Cmd.prototype.run, Cmd);
}

describe('voice guards', () => {
  test('RequireVoice passes with a channel, blocks without', async () => {
    class Cmd {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Cmd.prototype, 'run');
    RequireVoice()(Cmd.prototype, 'run', descriptor as PropertyDescriptor);
    const guard = new VoiceGuard();
    assert.equal(await guard.canActivate(contextOf(fakeSource('v1', null, []))), true);
    const seen: unknown[] = [];
    assert.equal(await guard.canActivate(contextOf(fakeSource(null, null, seen))), false);
    assert.match((seen[0] as { content: string }).content, /voice channel/);
  });

  test('SameVoice passes when shared or bot idle, blocks otherwise', async () => {
    class Cmd {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Cmd.prototype, 'run');
    SameVoice()(Cmd.prototype, 'run', descriptor as PropertyDescriptor);
    const guard = new SameVoiceGuard();
    assert.equal(await guard.canActivate(contextOf(fakeSource('v1', 'v1', []))), true);
    assert.equal(await guard.canActivate(contextOf(fakeSource('v1', null, []))), true);
    const seen: unknown[] = [];
    assert.equal(await guard.canActivate(contextOf(fakeSource('v1', 'v2', seen))), false);
    assert.match((seen[0] as { content: string }).content, /my voice channel/);
    const seen2: unknown[] = [];
    assert.equal(await guard.canActivate(contextOf(fakeSource(null, 'v2', seen2))), false);
    assert.match((seen2[0] as { content: string }).content, /voice channel first/);
  });
});
