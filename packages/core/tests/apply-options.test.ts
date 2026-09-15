import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { SlashCommandBuilder } from 'discord.js';
import {
  AttachmentOption,
  BooleanOption,
  ChannelOption,
  IntegerOption,
  MentionableOption,
  NumberOption,
  RoleOption,
  StringOption,
  UserOption,
} from '@discord.ts/common';
import { applyOptions } from '../src/discovery/discord-args.js';

class DemoDto {
  @StringOption({
    name: 's',
    description: 'S',
    required: true,
    minLength: 1,
    maxLength: 5,
    nameLocalizations: { fr: 'ss' },
    descriptionLocalizations: { fr: 'SS' },
    choices: [
      { name: 'one', value: 'one', nameLocalizations: { fr: 'un' } },
      { name: 'two', value: 'two' },
    ],
  })
  s?: string;

  @IntegerOption({ name: 'i', description: 'I', minValue: 1, maxValue: 10 })
  i?: number;

  @NumberOption({ name: 'n', description: 'N', choices: [{ name: 'half', value: 0.5 }] })
  n?: number;

  @BooleanOption({ name: 'b', description: 'B' })
  b?: boolean;

  @UserOption({ name: 'u', description: 'U' })
  u?: unknown;

  @ChannelOption({ name: 'c', description: 'C', channelTypes: [0] })
  c?: unknown;

  @RoleOption({ name: 'r', description: 'R' })
  r?: unknown;

  @MentionableOption({ name: 'm', description: 'M' })
  m?: unknown;

  @AttachmentOption({ name: 'a', description: 'A' })
  a?: unknown;
}

describe('applyOptions', () => {
  test('mirrors every option kind onto the builder', () => {
    const b = new SlashCommandBuilder().setName('demo').setDescription('Demo');
    applyOptions(b, DemoDto as never, 'commands:demo');
    const byName = new Map(
      (b.toJSON().options ?? []).map((o) => [o.name, o as Record<string, unknown>]),
    );
    assert.equal(byName.size, 9);
    assert.equal(byName.get('s')?.['required'], true);
    assert.equal(byName.get('s')?.['min_length'], 1);
    assert.equal(byName.get('s')?.['max_length'], 5);
    assert.deepEqual(byName.get('s')?.['name_localizations'], { fr: 'ss' });
    assert.deepEqual(byName.get('s')?.['description_localizations'], { fr: 'SS' });
    const choices = byName.get('s')?.['choices'] as Array<Record<string, unknown>>;
    assert.deepEqual(choices[0]?.['name_localizations'], { fr: 'un' });
    assert.equal(byName.get('i')?.['min_value'], 1);
    assert.equal(byName.get('i')?.['max_value'], 10);
    const numChoices = byName.get('n')?.['choices'] as Array<Record<string, unknown>>;
    assert.deepEqual(
      numChoices.map((c) => ({ name: c['name'], value: c['value'] })),
      [{ name: 'half', value: 0.5 }],
    );
    assert.deepEqual(byName.get('c')?.['channel_types'], [0]);
  });

  test('skips options without a DTO', () => {
    const b = new SlashCommandBuilder().setName('demo').setDescription('Demo');
    applyOptions(b, undefined);
    assert.deepEqual(b.toJSON().options, []);
  });
});
