import { ApplicationCommandType, type InteractionContextType } from 'discord.js';
import { SetMetadata } from '../di.js';
import { CONTEXT_MENU_METADATA } from '../constants.js';

export interface ContextMenuMeta {
  name: string;
  type: ApplicationCommandType.User | ApplicationCommandType.Message;
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: InteractionContextType[];
}

export const ContextMenu = (meta: ContextMenuMeta): MethodDecorator =>
  SetMetadata(CONTEXT_MENU_METADATA, meta);
