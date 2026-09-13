import type { ChannelType } from 'discord.js';
import { OPTION_FIELD_METADATA } from '../constants';

/** Channel kinds Discord accepts on channel options (no DMs, groups, directories). */
export type GuildChannelType = Exclude<
  ChannelType,
  ChannelType.DM | ChannelType.GroupDM | ChannelType.GuildDirectory
>;

export interface OptionFieldMeta {
  kind:
    | 'string'
    | 'integer'
    | 'number'
    | 'boolean'
    | 'user'
    | 'channel'
    | 'role'
    | 'mentionable'
    | 'attachment';
  name: string;
  description: string;
  required?: boolean;
  autocomplete?: boolean;
  choices?: readonly { name: string; value: string | number }[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  channelTypes?: GuildChannelType[];
}

function field(kind: OptionFieldMeta['kind']) {
  return (opt: Omit<OptionFieldMeta, 'kind'>): PropertyDecorator =>
    (target, key) => {
      const ctor = (target as object).constructor;
      const all: Record<string | symbol, OptionFieldMeta> =
        Reflect.getMetadata(OPTION_FIELD_METADATA, ctor) ?? {};
      all[key] = { ...opt, kind };
      Reflect.defineMetadata(OPTION_FIELD_METADATA, all, ctor);
    };
}

export const StringOption = field('string');
export const IntegerOption = field('integer');
export const NumberOption = field('number');
export const BooleanOption = field('boolean');
export const UserOption = field('user');
export const ChannelOption = field('channel');
export const RoleOption = field('role');
export const MentionableOption = field('mentionable');
export const AttachmentOption = field('attachment');
