import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { initI18n } from '@discord.ts/i18n';
import { DiscordDiscoveryService, type DiscordSyncService } from '../src/index.js';

function newService() {
  const client = { login: async () => 'ok', destroy: async () => {} };
  const sync = { sync: async () => {} } as unknown as DiscordSyncService;
  return new DiscordDiscoveryService(
    client as never,
    { token: 'tok', clientId: 'cid', skipRegistration: true, intents: [] },
    sync,
  );
}

function apply(decorator: MethodDecorator, proto: object, name: string): void {
  decorator(proto, name, Object.getOwnPropertyDescriptor(proto, name) as PropertyDescriptor);
}

describe('DiscordDiscoveryService.helpEntries', () => {
  const PlayGroup = createCommandGroupDecorator({
    name: 'play',
    description: 'Play games',
    category: 'Fun',
    toggleable: true,
  });
  const MiniGroup = createCommandGroupDecorator({ name: 'mini', description: 'Mini' });

  class PingCmd {
    ping(): void {}
  }
  apply(Command({ name: 'ping', description: 'Pong' }), PingCmd.prototype, 'ping');

  class HuntCmd {
    hunt(): void {}
  }
  apply(
    Command({
      name: 'hunt',
      description: 'Catch animals',
      category: 'Gameplay',
      toggleable: true,
    }),
    HuntCmd.prototype,
    'hunt',
  );

  class PlayCmd {
    dice(): void {}
    badge(): void {}
  }
  (PlayGroup() as ClassDecorator)(PlayCmd);
  apply(Subcommand({ name: 'dice', description: 'Dice' }), PlayCmd.prototype, 'dice');
  apply(MiniGroup({ category: 'Nope' }) as MethodDecorator, PlayCmd.prototype, 'badge');
  apply(Subcommand({ name: 'badge', description: 'Badge' }), PlayCmd.prototype, 'badge');

  test('one entry per top-level command; a group counts once, by group name', () => {
    const service = newService();
    service.init([new PingCmd(), new HuntCmd(), new PlayCmd()]);
    const entries = service.helpEntries();
    assert.deepEqual(
      entries.map((e) => e.name),
      ['ping', 'hunt', 'play'],
    );
    assert.deepEqual(entries[0], {
      name: 'ping',
      description: 'Pong',
      category: undefined,
      descriptionLocalizations: undefined,
      toggleable: false,
    });
    assert.equal(entries[1]?.category, 'Gameplay');
    assert.equal(entries[1]?.toggleable, true);
    assert.equal(entries[2]?.category, 'Fun');
    assert.equal(entries[2]?.toggleable, true);
  });

  test('description localizations merge the i18n catalog with explicit maps', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-help-'));
    fs.mkdirSync(path.join(dir, 'de'));
    fs.writeFileSync(
      path.join(dir, 'de/commands.json'),
      JSON.stringify({ hunt: { description: 'Jagen auf Deutsch' } }),
    );
    class HuntFr {
      hunt(): void {}
    }
    apply(
      Command({
        name: 'hunt',
        description: 'Catch animals',
        descriptionLocalizations: { fr: 'Chasser' },
      }),
      HuntFr.prototype,
      'hunt',
    );
    initI18n({ localesDir: dir, languages: ['de'] });
    try {
      const service = newService();
      service.init([new HuntFr()]);
      assert.deepEqual(service.helpEntries()[0]?.descriptionLocalizations, {
        de: 'Jagen auf Deutsch',
        fr: 'Chasser',
      });
    } finally {
      initI18n({ localesDir: path.join(dir, 'empty') });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
