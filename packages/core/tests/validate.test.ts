import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { ApplicationCommandType } from 'discord.js';
import { validateDiscoveryState, type DiscoveryState } from '../src/discovery/discord-validate.js';
import type { SlashEntry } from '../src/discovery/handler.types.js';

class Probe {
  run(): void {}
}

function base(partial: Partial<DiscoveryState> = {}): DiscoveryState {
  return {
    slash: [],
    menus: [],
    buttons: [],
    selects: [],
    modals: [],
    autocompletes: [],
    events: [],
    prefix: [],
    ...partial,
  };
}

function slash(over: Partial<SlashEntry> = {}): SlashEntry {
  return {
    instance: new Probe() as never,
    method: 'run',
    top: 'ping',
    topDescription: 'Pong',
    meta: { name: 'ping', description: 'Pong' },
    ...over,
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
  test('plain, grouped and prefixed entries pass', () => {
    validateDiscoveryState(
      base({
        slash: [
          slash(),
          slash({
            top: 'quest',
            topDescription: 'Quests',
            sub: 'reroll',
            subDescription: 'Reroll',
            group: 'daily',
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
        prefix: [{ instance: new Probe() as never, method: 'run', name: 'echo', aliases: ['e'] }],
        events: [{ instance: new Probe() as never, method: 'run', event: 'ready', once: false }],
        autocompletes: [{ instance: new Probe() as never, method: 'run', commandName: 'ping' }],
      }),
    );
  });
});

describe('slash validation', () => {
  test('rejects bad names, descriptions and duplicates', () => {
    expectsError(
      base({
        slash: [
          slash({
            top: 'BAD NAME',
            topDescription: '',
            sub: 'BAD SUB',
            group: 'BAD GROUP',
            subDescription: '',
          }),
        ],
      }),
      'slash name "BAD NAME" must be 1-32 lowercase',
      'description of /BAD NAME must be 1-100',
      'subcommand name "BAD SUB" must match',
      'description of /BAD NAME BAD GROUP BAD SUB must be 1-100',
      'group name "BAD GROUP" must match',
    );
    expectsError(base({ slash: [slash(), slash()] }), 'duplicate /ping (also in Probe.run)');
  });

  test('rejects mixed flags, mixed plain/sub and missing descriptions', () => {
    expectsError(
      base({
        slash: [
          slash(),
          slash({
            top: 'ping',
            topDescription: '',
            meta: { name: 'ping', description: 'Pong', nsfw: true },
          }),
        ],
      }),
      'mixes nsfw/permissions/contexts with another entry',
      'description of /ping must be 1-100',
    );
    expectsError(
      base({ slash: [slash(), slash({ top: 'ping', topDescription: 'Pong', sub: 'sub' })] }),
      '/ping mixes a plain command with subcommands',
    );
  });

  test('rejects more than 100 top-level commands', () => {
    const slash100 = Array.from({ length: 101 }, (_, i) =>
      slash({ top: `cmd${i}`, topDescription: 'x' }),
    );
    expectsError(base({ slash: slash100 }), 'top-level commands, max 100');
  });
});

describe('menu, component and prefix validation', () => {
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

  test('rejects bad prefix names, sub-routes and duplicate triggers', () => {
    expectsError(
      base({
        prefix: [
          { instance: new Probe() as never, method: 'run', name: 'two words', aliases: [] },
          {
            instance: new Probe() as never,
            method: 'run',
            name: 'ok',
            aliases: [],
            sub: 'bad sub',
          },
          { instance: new Probe() as never, method: 'run', name: 'dup', aliases: ['d'] },
          { instance: new Probe() as never, method: 'run', name: 'other', aliases: ['d'] },
        ],
      }),
      'prefix name must be one word',
      'prefix sub-route "bad sub" must be one word',
      'duplicate prefix trigger "d " (also in Probe.run)',
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
