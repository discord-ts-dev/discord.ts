import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { ApplicationCommandType } from 'discord.js';
import { type CommandDefinition, type CommandLeaf } from '../src/discovery/command-definition.js';
import { validateDiscoveryState, type DiscoveryState } from '../src/discovery/discord-validate.js';

class Probe {
  run(): void {}
}

function leaf(over: Partial<CommandLeaf> = {}): CommandLeaf {
  return { instance: new Probe() as never, method: 'run', description: 'Pong', ...over };
}

function def(over: Partial<CommandDefinition> = {}): CommandDefinition {
  return {
    name: 'ping',
    description: 'Pong',
    flags: {},
    subcommands: [],
    groups: [],
    issues: [],
    ...over,
  };
}

function base(partial: Partial<DiscoveryState> = {}): DiscoveryState {
  return {
    commands: [],
    menus: [],
    buttons: [],
    selects: [],
    modals: [],
    autocompletes: [],
    events: [],
    ...partial,
  };
}

function expectsError(state: DiscoveryState, ...fragments: string[]): void {
  try {
    validateDiscoveryState(state);
  } catch (err) {
    const message = (err as Error).message;
    for (const fragment of fragments) assert.ok(message.includes(fragment), `missing: ${fragment}`);
    return;
  }
  assert.fail('expected validateDiscoveryState to throw');
}

describe('validateDiscoveryState accepts a healthy app', () => {
  test('plain, grouped and leaf entries pass', () => {
    validateDiscoveryState(
      base({
        commands: [
          def({ plain: leaf() }),
          def({
            name: 'quest',
            description: 'Quests',
            groups: [
              {
                name: 'daily',
                description: 'Daily',
                subcommands: [leaf({ sub: 'reroll', group: 'daily', description: 'Reroll' })],
              },
            ],
          }),
        ],
        menus: [
          {
            instance: new Probe() as never,
            method: 'run',
            name: 'Inspect',
            type: ApplicationCommandType.Message,
            meta: { name: 'Inspect', type: ApplicationCommandType.Message },
          },
        ],
        buttons: [{ instance: new Probe() as never, method: 'run', customId: 'ok' }],
        events: [{ instance: new Probe() as never, method: 'run', event: 'ready', once: false }],
        autocompletes: [{ instance: new Probe() as never, method: 'run', commandName: 'ping' }],
      }),
    );
  });
});

describe('command validation', () => {
  test('rejects bad names and descriptions', () => {
    expectsError(
      base({
        commands: [
          def({
            name: 'BAD NAME',
            description: '',
            plain: leaf({ sub: 'BAD SUB', group: 'BAD GROUP', description: '' }),
          }),
        ],
      }),
      'slash name "BAD NAME" must be 1-32 lowercase',
      '/BAD NAME: description must be 1-100',
      'subcommand name "BAD SUB" must match',
      'description of /BAD NAME BAD GROUP BAD SUB must be 1-100',
      'group name "BAD GROUP" must match',
    );
  });

  test('reports the structural issues the builder recorded', () => {
    expectsError(
      base({ commands: [def({ issues: ['Probe.two: duplicate /ping (also in Probe.run)'] })] }),
      'duplicate /ping (also in Probe.run)',
    );
    expectsError(
      base({
        commands: [
          def({
            issues: [
              'Probe.run: /ping mixes command flags with another entry',
              '/ping mixes a plain command with subcommands',
            ],
          }),
        ],
      }),
      'mixes command flags',
      '/ping mixes a plain command with subcommands',
    );
  });

  test('rejects more than 100 top-level commands', () => {
    const many = Array.from({ length: 101 }, (_, i) => def({ name: `cmd${i}`, description: 'x' }));
    expectsError(base({ commands: many }), 'top-level commands, max 100');
  });
});

describe('menu and component validation', () => {
  test('rejects bad menu names, nsfw and duplicates', () => {
    const menu = (name: string, nsfw?: boolean) => ({
      instance: new Probe() as never,
      method: 'run',
      name,
      type: ApplicationCommandType.User as ApplicationCommandType.User,
      meta: { name, type: ApplicationCommandType.User as ApplicationCommandType.User, nsfw },
    });
    expectsError(
      base({ menus: [menu('x'.repeat(33), true), menu('same'), menu('same')] }),
      'menu name must be 1-32 chars',
      'menu nsfw is not sent, remove it',
      'duplicate menu "same"',
    );
  });

  test('rejects over-long customIds on every component kind', () => {
    const id = 'x'.repeat(101);
    expectsError(
      base({
        buttons: [{ instance: new Probe() as never, method: 'run', customId: id }],
        selects: [{ instance: new Probe() as never, method: 'run', kind: 'string', customId: id }],
        modals: [{ instance: new Probe() as never, method: 'run', customId: id }],
      }),
      'button customId must be 1-100 chars',
      'select customId must be 1-100 chars',
      'modal customId must be 1-100 chars',
    );
  });

  test('rejects empty events and orphan autocompletes', () => {
    expectsError(
      base({
        events: [{ instance: new Probe() as never, method: 'run', event: '', once: false }],
        autocompletes: [{ instance: new Probe() as never, method: 'run', commandName: 'missing' }],
      }),
      'event is empty',
      'autocomplete targets missing command "missing"',
    );
  });
});
