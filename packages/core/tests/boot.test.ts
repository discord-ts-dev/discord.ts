import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { Module, PrefixCommand, SlashCommand } from '@discord.ts/common';
import { DiscordModule, createRuntime } from '../src/index.js';

describe('Boot scan', () => {
  test('finds slash and prefix handlers from providers', async () => {
    class PingProbe {
      ping(): void {}

      echo(): void {}
    }
    const pingDesc = Object.getOwnPropertyDescriptor(PingProbe.prototype, 'ping');
    SlashCommand({ name: 'ping', description: 'Reply with pong' })(
      PingProbe.prototype,
      'ping',
      pingDesc as PropertyDescriptor,
    );
    const echoDesc = Object.getOwnPropertyDescriptor(PingProbe.prototype, 'echo');
    PrefixCommand({ name: 'echo', description: 'Repeat' })(
      PingProbe.prototype,
      'echo',
      echoDesc as PropertyDescriptor,
    );

    class ProbeApp {}
    Module({
      imports: [
        DiscordModule.forRoot({ token: 'test-token', clientId: 'test-client', intents: [] }),
      ],
      providers: [PingProbe],
    })(ProbeApp);

    const { discovery } = await createRuntime(ProbeApp);
    try {
      assert.deepStrictEqual(
        discovery.slash.map((s) => s.top),
        ['ping'],
      );
      assert.deepStrictEqual(
        discovery.prefix.map((p) => p.name),
        ['echo'],
      );
    } finally {
      await discovery.stop();
    }
  });
});
