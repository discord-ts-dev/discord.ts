import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { applyOptions, buildDtoFromArgs, splitSubroute } from '../src/discovery/discord-args.js';
import { AllDto, Coercions, QueryDto } from './dto-fixtures.js';

describe('buildDtoFromArgs coercions', () => {
  const dtoOf = (args: string[]): Record<string, unknown> => ({
    ...buildDtoFromArgs(Coercions as never, args),
  });

  test('integer, number, boolean and mention coercion', () => {
    assert.deepEqual(dtoOf(['7', '1.25', 'true', '<@123>']), {
      i: 7,
      n: 1.25,
      b: true,
      u: '123',
    });
    assert.deepEqual(dtoOf(['x', 'abc', 'false', '<@&42>']), {
      i: 'x',
      n: 'abc',
      b: false,
      u: '42',
    });
    assert.deepEqual(dtoOf(['1', '', 'maybe', 'plain']), {
      i: 1,
      n: '',
      b: 'maybe',
      u: 'plain',
    });
  });

  test('missing positional args stay undefined and the trailing string joins', () => {
    assert.deepEqual(dtoOf([]), { i: undefined, n: undefined, b: undefined, u: undefined });
    assert.deepEqual({ ...buildDtoFromArgs(QueryDto as never, ['a', 'b', 'c']) }, { q: 'a b c' });
  });
});

describe('splitSubroute', () => {
  test('matches the first token case-insensitively or returns null', () => {
    assert.deepEqual(splitSubroute(['RR', '2'], ['rr', 'lock']), { route: 'rr', rest: ['2'] });
    assert.equal(splitSubroute(['x'], ['rr']), null);
    assert.equal(splitSubroute([], ['rr']), null);
  });
});

describe('applyOptions', () => {
  test('is a no-op without a DTO', () => {
    const builder = new SlashCommandBuilder().setName('noop').setDescription('noop');
    applyOptions(builder as never, undefined);
    assert.deepEqual((builder.toJSON() as { options?: unknown[] }).options ?? [], []);
  });

  test('mirrors every field onto the builder', () => {
    const builder = new SlashCommandBuilder().setName('all').setDescription('all');
    applyOptions(builder as never, AllDto as never);
    const json = builder.toJSON() as {
      options?: Array<{
        name: string;
        type: number;
        required?: boolean;
        autocomplete?: boolean;
        choices?: unknown[];
        min_length?: number;
        max_length?: number;
        min_value?: number;
        max_value?: number;
        channel_types?: number[];
      }>;
    };
    const byName = new Map((json.options ?? []).map((o) => [o.name, o]));
    assert.equal(byName.get('s')?.required, true);
    assert.equal(byName.get('s')?.autocomplete, true);
    assert.equal(byName.get('s2')?.choices?.length, 1);
    assert.equal(byName.get('s')?.min_length, 1);
    assert.equal(byName.get('s')?.max_length, 5);
    assert.equal(byName.get('i')?.min_value, 1);
    assert.equal(byName.get('i')?.max_value, 9);
    assert.equal(byName.get('n')?.min_value, 0.5);
    assert.deepEqual(byName.get('c')?.channel_types, [ChannelType.GuildText]);
    for (const name of ['b', 'u', 'c', 'r', 'm', 'f']) assert.ok(byName.has(name), name);
  });
});
