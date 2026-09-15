import 'reflect-metadata';
import {
  AttachmentOption,
  BooleanOption,
  ChannelOption,
  IntegerOption,
  MentionableOption,
  NumberOption,
  UserOption,
  RoleOption,
  StringOption,
} from '@discord.ts/common';
import { ChannelType } from 'discord.js';

export class QueryDto {
  @StringOption({ name: 'q', description: 'Search text', required: false })
  q?: string;
}

export class AllDto {
  @StringOption({
    name: 's',
    description: 's',
    required: true,
    autocomplete: true,
    minLength: 1,
    maxLength: 5,
  })
  s?: string;

  @StringOption({
    name: 's2',
    description: 's2',
    required: false,
    choices: [{ name: 'A', value: 'a' }],
  })
  s2?: string;

  @IntegerOption({
    name: 'i',
    description: 'i',
    required: false,
    choices: [{ name: 'One', value: 1 }],
    minValue: 1,
    maxValue: 9,
  })
  i?: number;

  @NumberOption({ name: 'n', description: 'n', required: false, minValue: 0.5, maxValue: 2.5 })
  n?: number;

  @BooleanOption({ name: 'b', description: 'b', required: false })
  b?: boolean;

  @UserOption({ name: 'u', description: 'u', required: false })
  u?: string;

  @ChannelOption({
    name: 'c',
    description: 'c',
    required: false,
    channelTypes: [ChannelType.GuildText],
  })
  c?: string;

  @RoleOption({ name: 'r', description: 'r', required: false })
  r?: string;

  @MentionableOption({ name: 'm', description: 'm', required: false })
  m?: string;

  @AttachmentOption({ name: 'f', description: 'f', required: false })
  f?: string;
}

export class Coercions {
  @IntegerOption({ name: 'i', description: 'i', required: false })
  i?: unknown;

  @NumberOption({ name: 'n', description: 'n', required: false })
  n?: unknown;

  @BooleanOption({ name: 'b', description: 'b', required: false })
  b?: unknown;

  @UserOption({ name: 'u', description: 'u', required: false })
  u?: unknown;
}
