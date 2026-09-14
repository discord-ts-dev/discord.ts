// ponytail: property tests double as the Scorecard fuzzing signal (fast-check).
import assert from 'node:assert';
import { describe, test } from 'node:test';
import * as fc from 'fast-check';
import { validateDiscoveryState, type DiscoveryState } from '../src/discovery/discord-validate.js';
import type { SlashEntry } from '../src/discovery/handler.types.js';

const empty: DiscoveryState = {
  slash: [],
  menus: [],
  buttons: [],
  selects: [],
  modals: [],
  autocompletes: [],
  events: [],
  prefix: [],
};

const NAME = /^[\p{Ll}\p{Nd}_-]{1,32}$/u;
const nameArb = fc.string({ unit: fc.constantFrom(...'abcxyz019_-'), minLength: 1, maxLength: 32 });
const descArb = fc.string({ minLength: 1, maxLength: 100 });
const badNameArb = fc.string({ maxLength: 40 }).filter((s) => !NAME.test(s));

function entry(top: string, method: string, sub?: string): SlashEntry {
  return {
    instance: { [method]: () => undefined },
    method,
    top,
    topDescription: 'd',
    sub,
    meta: { name: top, description: 'd' },
  };
}

describe('validateDiscoveryState properties', () => {
  test('accepts any generated valid slash entry', () => {
    fc.assert(
      fc.property(nameArb, descArb, (top, desc) => {
        const s: DiscoveryState = {
          ...empty,
          slash: [{ ...entry(top, 'run'), topDescription: desc }],
        };
        assert.doesNotThrow(() => validateDiscoveryState(s));
      }),
    );
  });

  test('rejects any top name outside the NAME grammar', () => {
    fc.assert(
      fc.property(badNameArb, (top) => {
        const s: DiscoveryState = { ...empty, slash: [entry(top, 'run')] };
        assert.throws(() => validateDiscoveryState(s), /slash name/);
      }),
    );
  });

  test('rejects duplicate top/group/sub keys', () => {
    fc.assert(
      fc.property(nameArb, fc.option(nameArb), (top, sub) => {
        const s: DiscoveryState = {
          ...empty,
          slash: [entry(top, 'one', sub ?? undefined), entry(top, 'two', sub ?? undefined)],
        };
        assert.throws(() => validateDiscoveryState(s), /duplicate/);
      }),
    );
  });
});
