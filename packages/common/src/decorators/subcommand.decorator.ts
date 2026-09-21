import { SetMetadata } from '../di.js';
import type { LocalizationMap } from 'discord.js';
import { COMMAND_GROUP_METADATA, SUBCOMMAND_METADATA } from '../constants.js';

export interface CommandGroupMeta {
  name: string;
  description: string;
  nameLocalizations?: LocalizationMap;
  descriptionLocalizations?: LocalizationMap;
  /** Free-form help grouping label. Top-level only; raw string, never localized. */
  category?: string;
  /** Guilds may switch this group off, whole. Informational; drives enable/disable choice feeds. */
  toggleable?: boolean;
}

export interface SubcommandMeta {
  name: string;
  description: string;
  nameLocalizations?: LocalizationMap;
  descriptionLocalizations?: LocalizationMap;
}

// Top-level group: @MyGroup() on class. Sub-group: @MyGroup({ subgroup }) on method is handled by discovery via parent chain.
// Keep one factory, no verbose include[] arrays.
export function createCommandGroupDecorator(meta: CommandGroupMeta) {
  const dec = (override?: Partial<CommandGroupMeta>): ClassDecorator & MethodDecorator =>
    SetMetadata(COMMAND_GROUP_METADATA, { ...meta, ...override }) as unknown as ClassDecorator &
      MethodDecorator;
  return dec;
}

export const Subcommand = (meta: SubcommandMeta): MethodDecorator =>
  SetMetadata(SUBCOMMAND_METADATA, meta);
