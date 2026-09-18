import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { OPTION_FIELD_METADATA } from '@discord.ts/common';
import { type CommandDefinition, type CommandLeaf } from '../src/discovery/command-definition.js';
import { validateDiscoveryState, type DiscoveryState } from '../src/discovery/discord-validate.js';

class Probe {
  run(): void {}
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

function defWithDto(Dto: object, over: Partial<CommandDefinition> = {}): CommandDefinition {
  return def({
    plain: leaf({ options: Dto as new () => Record<string, unknown> }),
    ...over,
  });
}

describe('option field validation', () => {
  test('reports every field-level violation', () => {
    const many = Array.from({ length: 26 }, (_, i) => ({ name: `c${i}`, value: 'v' }));
    class BadDto {}
    Reflect.defineMetadata(
      OPTION_FIELD_METADATA,
      {
        badName: { kind: 'string', name: 'BAD NAME', description: 'd', required: false },
        noDesc: { kind: 'string', name: 'ok', description: '', required: false },
        boolChoices: {
          kind: 'boolean',
          name: 'b',
          description: 'd',
          required: false,
          choices: [{ name: 'x', value: 'a' }],
        },
        tooMany: { kind: 'string', name: 'many', description: 'd', required: false, choices: many },
        badChoiceName: {
          kind: 'string',
          name: 'cn',
          description: 'd',
          required: false,
          choices: [{ name: '', value: 'a' }],
        },
        badString: {
          kind: 'string',
          name: 'bs',
          description: 'd',
          required: false,
          choices: [{ name: 'x', value: 1 }],
        },
        badInteger: {
          kind: 'integer',
          name: 'bi',
          description: 'd',
          required: false,
          choices: [{ name: 'x', value: 1.5 }],
        },
        badNumber: {
          kind: 'number',
          name: 'bn',
          description: 'd',
          required: false,
          choices: [{ name: 'x', value: Number.POSITIVE_INFINITY }],
        },
        autoBool: {
          kind: 'boolean',
          name: 'ab',
          description: 'd',
          required: false,
          autocomplete: true,
        },
        lenInt: { kind: 'integer', name: 'li', description: 'd', required: false, minLength: 1 },
        negMin: { kind: 'string', name: 'nm', description: 'd', required: false, minLength: -1 },
        zeroMax: { kind: 'string', name: 'zm', description: 'd', required: false, maxLength: 0 },
        inverted: {
          kind: 'string',
          name: 'inv',
          description: 'd',
          required: false,
          minLength: 5,
          maxLength: 2,
        },
        valStr: { kind: 'string', name: 'vs', description: 'd', required: false, minValue: 1 },
        valInverted: {
          kind: 'integer',
          name: 'vi',
          description: 'd',
          required: false,
          minValue: 5,
          maxValue: 1,
        },
        typesStr: {
          kind: 'string',
          name: 'ts',
          description: 'd',
          required: false,
          channelTypes: [0],
        },
        emptyTypes: {
          kind: 'channel',
          name: 'et',
          description: 'd',
          required: false,
          channelTypes: [],
        },
        required: { kind: 'string', name: 'req', description: 'd', required: true },
        after: { kind: 'string', name: 'after', description: 'd', required: true },
      },
      BadDto,
    );
    expectsError(
      base({ commands: [defWithDto(BadDto)] }),
      'must be 1-32 lowercase letters',
      'description must be 1-100 chars',
      'choices need a string, integer, or number option',
      'holds 26 choices, max 25',
      'choice names must be 1-100 chars',
      'string choices need a string value up to 100 chars',
      'integer choices need an integer value',
      'number choices need a finite number value',
      'autocomplete needs a string, integer, or number option',
      'min/max length need a string option',
      'minLength is negative',
      'maxLength must be positive',
      'minLength exceeds maxLength',
      'min/max value need an integer or number option',
      'minValue exceeds maxValue',
      'channelTypes need a channel option',
      'channelTypes is empty',
      'required option "after" follows an optional one',
    );
  });

  test('rejects more than 25 options', () => {
    const fields: Record<string, unknown> = {};
    for (let i = 0; i < 26; i++) {
      fields[`f${i}`] = { kind: 'string', name: `f${i}`, description: 'd', required: false };
    }
    class WideDto {}
    Reflect.defineMetadata(OPTION_FIELD_METADATA, fields, WideDto);
    expectsError(base({ commands: [defWithDto(WideDto)] }), 'holds 26 options, max 25');
  });
});
