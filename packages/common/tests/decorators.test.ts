import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { ApplicationCommandType } from 'discord.js';
import {
  AUTOCOMPLETE_METADATA,
  Author,
  Autocomplete,
  BUTTON_METADATA,
  Button,
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  CONTEXT_MENU_METADATA,
  ChannelSelect,
  Command,
  Context,
  ContextMenu,
  Guild,
  Locale,
  MODAL_METADATA,
  MentionableSelect,
  Modal,
  ON_EVENT_METADATA,
  OnEvent,
  OnceEvent,
  Options,
  PARAM_AUTHOR_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_GUILD_METADATA,
  PARAM_LOCALE_METADATA,
  PARAM_OPTIONS_METADATA,
  RoleSelect,
  SELECT_METADATA,
  StringSelect,
  UserSelect,
  createCommandGroupDecorator,
} from '../src/index.js';

type Loose = (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => unknown;
type LooseParam = (target: object, key: string | symbol | undefined, index: number) => unknown;
const loose = (dec: unknown): Loose => dec as unknown as Loose;
const looseParam = (dec: unknown): LooseParam => dec as unknown as LooseParam;

class Probe {
  run(): void {}
}

const descriptor = (): PropertyDescriptor =>
  Object.getOwnPropertyDescriptor(Probe.prototype, 'run') as PropertyDescriptor;

const metaOf = (key: string): unknown => Reflect.getMetadata(key, Probe.prototype.run);

describe('Command', () => {
  test('publishes the metadata under the unified command key', () => {
    const meta = { name: 'ping', description: 'Reply with pong' };
    loose(Command(meta))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(COMMAND_METADATA), meta);
  });

  test('carries help fields through untouched', () => {
    const meta = {
      name: 'hunt',
      description: 'Catch animals',
      category: 'Gameplay',
      toggleable: true,
    };
    loose(Command(meta))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(COMMAND_METADATA), meta);
  });
});

describe('command group decorators', () => {
  test('base help fields survive an override merge', () => {
    const Shop = createCommandGroupDecorator({
      name: 'shop',
      description: 'Paw shop',
      category: 'Economy',
      toggleable: true,
    });
    loose(Shop({ description: 'Shop and bag' }))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(COMMAND_GROUP_METADATA), {
      name: 'shop',
      description: 'Shop and bag',
      category: 'Economy',
      toggleable: true,
    });
  });
});

describe('component decorators', () => {
  test('button and modal store a customId', () => {
    loose(Button('btn'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(BUTTON_METADATA), { customId: 'btn' });
    loose(Modal(/modal-/))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(MODAL_METADATA), { customId: /modal-/ });
  });

  test('selects store kind plus customId', () => {
    loose(StringSelect('s'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(SELECT_METADATA), { kind: 'string', customId: 's' });
    loose(UserSelect('s'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(SELECT_METADATA), { kind: 'user', customId: 's' });
    loose(RoleSelect('s'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(SELECT_METADATA), { kind: 'role', customId: 's' });
    loose(ChannelSelect('s'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(SELECT_METADATA), { kind: 'channel', customId: 's' });
    loose(MentionableSelect('s'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(SELECT_METADATA), { kind: 'mentionable', customId: 's' });
  });

  test('autocomplete stores the optional command name', () => {
    loose(Autocomplete('ping'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(AUTOCOMPLETE_METADATA), { commandName: 'ping' });
    loose(Autocomplete())(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(AUTOCOMPLETE_METADATA), { commandName: undefined });
  });
});

describe('ContextMenu', () => {
  test('stores the application command type', () => {
    const meta = {
      name: 'Inspect',
      type: ApplicationCommandType.Message as ApplicationCommandType.Message,
      contexts: [] as never[],
    };
    loose(ContextMenu(meta))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(CONTEXT_MENU_METADATA), meta);
  });
});

describe('event decorators', () => {
  test('OnEvent and OnceEvent set the once flag', () => {
    loose(OnEvent('messageCreate'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(ON_EVENT_METADATA), { event: 'messageCreate', once: false });
    loose(OnceEvent('ready'))(Probe.prototype, 'run', descriptor());
    assert.deepEqual(metaOf(ON_EVENT_METADATA), { event: 'ready', once: true });
  });
});

describe('parameter decorators', () => {
  test('each records its own index list', () => {
    const cases: Array<[unknown, string]> = [
      [Context(), PARAM_CONTEXT_METADATA],
      [Options(), PARAM_OPTIONS_METADATA],
      [Guild(), PARAM_GUILD_METADATA],
      [Author(), PARAM_AUTHOR_METADATA],
      [Locale(), PARAM_LOCALE_METADATA],
    ];
    for (const [dec, key] of cases) {
      looseParam(dec)(Probe.prototype, 'run', 0);
      looseParam(dec)(Probe.prototype, 'run', 1);
      assert.deepEqual(metaOf(key), [0, 1]);
    }
  });

  test('is a no-op without a method key', () => {
    looseParam(Context())(Probe.prototype, undefined, 0);
    assert.equal(Reflect.getMetadata(PARAM_CONTEXT_METADATA, Probe.prototype), undefined);
  });
});
