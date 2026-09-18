// ponytail: property tests double as the Scorecard fuzzing signal (fast-check).
import assert from 'node:assert';
import { describe, test } from 'bun:test';
import * as fc from 'fast-check';
import type { CommandDefinition } from '../src/discovery/command-definition.js';
import { validateDiscoveryState, type DiscoveryState } from '../src/discovery/discord-validate.js';

const empty: DiscoveryState = {
  commands: [],
  menus: [],
  buttons: [],
  selects: [],
  modals: [],
  autocompletes: [],
  events: [],
};

const NAME = /^[\p{Ll}\p{Nd}_-]{1,32}$/u;
const nameArb = fc.string({ unit: fc.constantFrom(...'abcxyz019_-'), minLength: 1, maxLength: 32 });
const descArb = fc.string({ minLength: 1, maxLength: 100 });
const badNameArb = fc.string({ maxLength: 40 }).filter((s) => !NAME.test(s));

function def(name: string, description: string): CommandDefinition {
  return { name, description, flags: {}, subcommands: [], groups: [], issues: [] };
}

describe('validateDiscoveryState properties', () => {
  test('accepts any generated valid command definition', () => {
    fc.assert(
      fc.property(nameArb, descArb, (name, description) => {
        const s: DiscoveryState = { ...empty, commands: [def(name, description)] };
        assert.doesNotThrow(() => validateDiscoveryState(s));
      }),
    );
  });

  test('rejects any top name outside the NAME grammar', () => {
    fc.assert(
      fc.property(badNameArb, (name) => {
        const s: DiscoveryState = { ...empty, commands: [def(name, 'd')] };
        assert.throws(() => validateDiscoveryState(s), /slash name/);
      }),
    );
  });

  test('surfaces any structural issue the builder recorded', () => {
    fc.assert(
      fc.property(nameArb, descArb, (name, description) => {
        const command = def(name, description);
        command.issues = [`Probe.run: duplicate /${name} (also in Probe.two)`];
        const s: DiscoveryState = { ...empty, commands: [command] };
        assert.throws(() => validateDiscoveryState(s), /duplicate/);
      }),
    );
  });
});
