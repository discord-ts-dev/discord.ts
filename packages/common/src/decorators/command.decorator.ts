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
}

export const Command = (meta: CommandMeta): MethodDecorator => SetMetadata(COMMAND_METADATA, meta);
