import { SetMetadata } from '../di.js';
import type { InteractionContextType } from 'discord.js';
import { COMMAND_METADATA } from '../constants.js';

export interface CommandFlags {
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: InteractionContextType[];
}

export interface CommandMeta extends CommandFlags {
  name: string;
  description: string;
  /** Register as slash command. At least one of slash/prefix must be true. */
  slash: boolean;
  /** Register as prefix command under the same name. */
  prefix: boolean;
  /** Extra text triggers for the prefix surface. */
  aliases?: string[];
}

// ponytail: one handler, both surfaces. Prefix args map positionally into the DTO.
export const Command = (meta: CommandMeta): MethodDecorator => SetMetadata(COMMAND_METADATA, meta);
