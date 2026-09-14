import { SetMetadata } from '../di.js';
import type { InteractionContextType } from 'discord.js';
import { SLASH_COMMAND_METADATA } from '../constants.js';

export interface SlashCommandMeta {
  name: string;
  description: string;
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: InteractionContextType[];
}

// ponytail: method-level only, class stays plain @Injectable()
export const SlashCommand = (meta: SlashCommandMeta): MethodDecorator =>
  SetMetadata(SLASH_COMMAND_METADATA, meta);
