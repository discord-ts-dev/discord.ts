import { SetMetadata } from '../di.js';
import type { InteractionContextType, LocalizationMap } from 'discord.js';
import { COMMAND_METADATA } from '../constants.js';

export interface CommandFlags {
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: InteractionContextType[];
  dmPermission?: boolean;
}

export interface CommandMeta extends CommandFlags {
  name: string;
  description: string;
  nameLocalizations?: LocalizationMap;
  descriptionLocalizations?: LocalizationMap;
  /** Free-form help grouping label. Top-level only; raw string, never localized. */
  category?: string;
  /** Guilds may switch this command off. Informational; drives enable/disable choice feeds. */
  toggleable?: boolean;
}

export const Command = (meta: CommandMeta): MethodDecorator => SetMetadata(COMMAND_METADATA, meta);
