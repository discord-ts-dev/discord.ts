import assert from 'node:assert';
import { describe, test } from 'bun:test';
import { Command, DISCORD_DISCOVERY, Inject, Module } from '@discord.ts/common';
import { DiscordModule, createRuntime } from '../src/index.js';

describe('Boot scan', () => {
  test('finds command handlers from providers', async () => {
    class PingProbe {
      ping(): void {}

      roll(): void {}
    }
    const pingDesc = Object.getOwnPropertyDescriptor(PingProbe.prototype, 'ping');
    Command({ name: 'ping', description: 'Reply with pong' })(
      PingProbe.prototype,
      'ping',
      pingDesc as PropertyDescriptor,
    );
    const rollDesc = Object.getOwnPropertyDescriptor(PingProbe.prototype, 'roll');
    Command({ name: 'roll', description: 'Roll dice' })(
      PingProbe.prototype,
      'roll',
      rollDesc as PropertyDescriptor,
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
        discovery.commands.map((c) => c.name),
        ['ping', 'roll'],
      );
    } finally {
      await discovery.stop();
    }
  });

  test('provides the discovery service under DISCORD_DISCOVERY', async () => {
    class UsesDiscovery {
      constructor(@Inject(DISCORD_DISCOVERY) readonly disc: unknown) {}
    }
    class TokenApp {}
    Module({
      imports: [
        DiscordModule.forRoot({ token: 'test-token', clientId: 'test-client', intents: [] }),
      ],
      providers: [UsesDiscovery],
    })(TokenApp);

    const { discovery, instances } = await createRuntime(TokenApp);
    try {
      const used = instances.find((i) => i instanceof UsesDiscovery);
      assert.equal(used?.disc, discovery);
    } finally {
      await discovery.stop();
    }
  });
});
