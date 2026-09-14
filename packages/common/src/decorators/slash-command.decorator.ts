import { SetMetadata } from '../di.js';
import type { InteractionContextType } from 'discord.js';
import { COMMAND_METADATA } from '../constants.js';

export interface SlashCommandMeta {
  name: string;
  description: string;
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: InteractionContextType[];
}

// ponytail: method-level only, class stays plain @Injectable()
// Writes the unified command key as slash-only; discovery owns the single branch.
export const SlashCommand = (meta: SlashCommandMeta): MethodDecorator =>
  SetMetadata(COMMAND_METADATA, { ...meta, slash: true, prefix: false });
