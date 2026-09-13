import { SetMetadata } from '@nestjs/common';
import { SLASH_COMMAND_METADATA } from '../constants';

export interface SlashCommandMeta {
  name: string;
  description: string;
}

// ponytail: method-level only, class stays plain @Injectable()
export const SlashCommand = (meta: SlashCommandMeta): MethodDecorator =>
  SetMetadata(SLASH_COMMAND_METADATA, meta);
