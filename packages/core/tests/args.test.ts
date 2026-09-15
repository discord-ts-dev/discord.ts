import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import {
  Author,
  Context,
  Guild,
  Locale,
  Options,
  PARAM_AUTHOR_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_GUILD_METADATA,
  PARAM_LOCALE_METADATA,
  PARAM_OPTIONS_METADATA,
} from '@discord.ts/common';
import {
  buildArgs,
  buildDto,
  buildEventArgs,
  optionsDto,
  resolveAuthor,
  resolveGuild,
} from '../src/discovery/discord-args.js';
import type { Handler } from '../src/discovery/handler.types.js';
import { AllDto, QueryDto } from './dto-fixtures.js';

function probe(instance: object, method: string): Handler {
  return { instance: instance as Record<string, (...a: never[]) => unknown>, method };
}

function descriptor(proto: object, method: string): PropertyDescriptor {
  return Object.getOwnPropertyDescriptor(proto, method) as PropertyDescriptor;
}

class Cmd {
  run(): void {}
}

Context()(Cmd.prototype, 'run', 0);
Options()(Cmd.prototype, 'run', 1);
Guild()(Cmd.prototype, 'run', 2);
Author()(Cmd.prototype, 'run', 3);
Locale()(Cmd.prototype, 'run', 4);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, QueryDto, Object, Object, String],
  Cmd.prototype,
  'run',
);

describe('optionsDto', () => {
  test('returns the DTO behind @Options()', () => {
    assert.equal(optionsDto(probe(new Cmd(), 'run')), QueryDto);
  });

  test('returns undefined without the decorator or a callable method', () => {
    class Bare {
      go(): void {}
    }
    assert.equal(optionsDto(probe(new Bare(), 'go')), undefined);
    assert.equal(optionsDto({ instance: { nope: 1 } as never, method: 'nope' }), undefined);
  });
});

describe('buildArgs', () => {
  test('fills every decorated slot from an interaction', () => {
    const interaction = {
      options: { getString: (name: string) => (name === 'q' ? 'term' : null) },
      guild: { id: 'g' },
      user: { id: 'u' },
      locale: 'de',
    };
    const args = buildArgs(probe(new Cmd(), 'run'), interaction, 'en-US');
    assert.deepEqual(args[0], interaction);
    assert.deepEqual({ ...(args[1] as object) }, { q: 'term' });
    assert.deepEqual(args[2], { id: 'g' });
    assert.deepEqual(args[3], { id: 'u' });
    assert.equal(args[4], 'de');
  });

  test('passes the interaction through when nothing is decorated', () => {
    class Lazy {
      go(_a: unknown, _b: unknown): void {}
    }
    Reflect.defineMetadata('design:paramtypes', [Object, Object], Lazy.prototype, 'go');
    const interaction = { id: 'ix' };
    assert.deepEqual(buildArgs(probe(new Lazy(), 'go'), interaction), [interaction, undefined]);
  });

  test('falls back to Object when a param type is missing', () => {
    class Missing {
      go(_a: unknown): void {}
    }
    Options()(Missing.prototype, 'go', 0);
    Reflect.defineMetadata(PARAM_OPTIONS_METADATA, [0], Missing.prototype.go);
    Reflect.defineMetadata('design:paramtypes', [undefined], Missing.prototype, 'go');
    const args = buildArgs(probe(new Missing(), 'go'), {});
    assert.deepEqual({ ...(args[0] as object) }, {});
  });
});

describe('resolveGuild and resolveAuthor', () => {
  test('prefers guild/author and falls back to null', () => {
    assert.deepEqual(resolveGuild({ guild: { id: 'g' } }), { id: 'g' });
    assert.equal(resolveGuild({}), null);
    assert.deepEqual(resolveAuthor({ author: { id: 'a' } }), { id: 'a' });
    assert.deepEqual(resolveAuthor({ user: { id: 'u' } }), { id: 'u' });
    assert.equal(resolveAuthor({}), null);
  });
});

describe('buildDto', () => {
  test('reads each option kind through its getter', () => {
    const dto = buildDto(AllDto as never, {
      options: {
        getString: () => 's',
        getInteger: () => 1,
        getNumber: () => 1.5,
        getBoolean: () => true,
        getUser: () => ({ id: 'u' }),
        getChannel: () => ({ id: 'c' }),
        getRole: () => ({ id: 'r' }),
        getMentionable: () => ({ id: 'm' }),
        getAttachment: () => ({ id: 'f' }),
      },
    });
    assert.deepEqual(
      { ...dto },
      {
        s: 's',
        s2: 's',
        i: 1,
        n: 1.5,
        b: true,
        u: { id: 'u' },
        c: { id: 'c' },
        r: { id: 'r' },
        m: { id: 'm' },
        f: { id: 'f' },
      },
    );
  });

  test('returns an empty DTO without options and swallows getter failures', () => {
    assert.deepEqual({ ...buildDto(QueryDto as never, {}) }, {});
    const dto = buildDto(QueryDto as never, {
      options: {
        getString: () => {
          throw new Error('interaction gone');
        },
      },
    });
    assert.equal(dto.q, undefined);
  });
});

describe('buildEventArgs', () => {
  test('layers derived params on raw args', () => {
    const args = buildEventArgs(
      probe(new Cmd(), 'run'),
      [{ guild: { id: 'g' }, user: { id: 'u' } }],
      'fr',
    );
    assert.deepEqual(args[0], { guild: { id: 'g' }, user: { id: 'u' } });
    assert.deepEqual(args[2], { id: 'g' });
    assert.deepEqual(args[3], { id: 'u' });
    assert.equal(args[4], 'fr');
  });

  test('keeps provided raw values over derived ones', () => {
    const args = buildEventArgs(
      probe(new Cmd(), 'run'),
      ['ctx', 'dto', 'raw-guild', 'raw-a'],
      'en',
    );
    assert.equal(args[2], 'raw-guild');
    assert.equal(args[3], 'raw-a');
  });
});

describe('command metadata helpers', () => {
  test('descriptor lookup helper stays unused-safe', () => {
    assert.ok(descriptor(Cmd.prototype, 'run'));
    assert.equal(PARAM_CONTEXT_METADATA.length > 0, true);
    assert.equal(PARAM_GUILD_METADATA.length > 0, true);
    assert.equal(PARAM_AUTHOR_METADATA.length > 0, true);
    assert.equal(PARAM_LOCALE_METADATA.length > 0, true);
  });
});
