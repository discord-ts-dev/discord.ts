import 'reflect-metadata';
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { initI18n } from '@discord.ts/i18n';
import { DiscordDiscoveryService, type DiscordSyncService } from '../src/index.js';

function apply(decorator: MethodDecorator, proto: object, name: string): void {
  decorator(proto, name, Object.getOwnPropertyDescriptor(proto, name) as PropertyDescriptor);
}

function service(): DiscordDiscoveryService {
  const client = { login: async () => 'ok', destroy: async () => undefined };
  const sync = { sync: async () => undefined } as unknown as DiscordSyncService;
  return new DiscordDiscoveryService(
    client as never,
    { token: 't', clientId: 'c', intents: [] },
    sync,
  );
}

const MethodGroup = createCommandGroupDecorator({ name: 'mg', description: 'Method group' });

describe('scan of subcommands without a class group', () => {
  test('@Command plus @Subcommand becomes top.sub with the command localizations', () => {
    class Probe {
      run(): void {}
    }
    apply(Command({ name: 'plain', description: 'Plain' }), Probe.prototype, 'run');
    apply(Subcommand({ name: 'one', description: 'One' }), Probe.prototype, 'run');
    const discovery = service();
    discovery.init([new Probe()]);
    const def = discovery.commands[0];
    assert.equal(def?.name, 'plain');
    assert.equal(def?.plain, undefined);
    assert.equal(def?.subcommands[0]?.sub, 'one');
    assert.equal(def?.subcommands[0]?.group, undefined);
    assert.equal(def?.localizations, undefined);
  });

  test('a method-level group names the command when there is no @Command', () => {
    class Probe {
      run(): void {}
    }
    apply(
      MethodGroup({ nameLocalizations: { fr: 'mg-fr' } }) as MethodDecorator,
      Probe.prototype,
      'run',
    );
    apply(Subcommand({ name: 'two', description: 'Two' }), Probe.prototype, 'run');
    const discovery = service();
    discovery.init([new Probe()]);
    assert.equal(discovery.commands[0]?.name, 'mg');
    assert.deepEqual(discovery.commands[0]?.localizations, {
      name: { fr: 'mg-fr' },
      description: undefined,
    });
  });

  test('a class group plus a method subgroup records group localizations', () => {
    const Group = createCommandGroupDecorator({
      name: 'quest',
      description: 'Quests',
      descriptionLocalizations: { fr: 'Quêtes' },
    });
    class Probe {
      run(): void {}
    }
    (Group() as ClassDecorator)(Probe);
    apply(
      MethodGroup({ nameLocalizations: { fr: 'jour' } }) as MethodDecorator,
      Probe.prototype,
      'run',
    );
    apply(Subcommand({ name: 'three', description: 'Three' }), Probe.prototype, 'run');
    const discovery = service();
    discovery.init([new Probe()]);
    assert.equal(discovery.commands[0]?.groups[0]?.name, 'mg');
    assert.deepEqual(discovery.commands[0]?.groups[0]?.localizations, {
      name: { fr: 'jour' },
      description: { fr: 'Quêtes' },
    });
  });
});

describe('init warns about locales Discord does not accept', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  test('logs the skipped locales', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-locales-'));
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, 'xx-XX'));
    fs.writeFileSync(
      path.join(dir, 'xx-XX', 'commands.json'),
      JSON.stringify({ ping: { name: 'x', description: 'x' } }),
    );
    initI18n({ localesDir: dir, defaultLocale: 'en-US' });

    const chunks: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      chunks.push(String(chunk));
      return true;
    }) as never;
    try {
      service().init([]);
    } finally {
      process.stdout.write = orig;
      initI18n({ localesDir: path.join(dir, 'missing') });
    }
    assert.match(chunks.join(''), /xx-XX/);
  });
});
