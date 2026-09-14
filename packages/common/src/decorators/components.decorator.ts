import { SetMetadata } from '../di.js';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  MODAL_METADATA,
  SELECT_METADATA,
} from '../constants.js';

export interface CustomIdMeta {
  customId: string | RegExp;
}

export const Button = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(BUTTON_METADATA, { customId } satisfies CustomIdMeta);

export const StringSelect = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(SELECT_METADATA, { kind: 'string', customId });

export const UserSelect = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(SELECT_METADATA, { kind: 'user', customId });

export const RoleSelect = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(SELECT_METADATA, { kind: 'role', customId });

export const ChannelSelect = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(SELECT_METADATA, { kind: 'channel', customId });

export const MentionableSelect = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(SELECT_METADATA, { kind: 'mentionable', customId });

export const Modal = (customId: string | RegExp): MethodDecorator =>
  SetMetadata(MODAL_METADATA, { customId } satisfies CustomIdMeta);

export const Autocomplete = (commandName?: string): MethodDecorator =>
  SetMetadata(AUTOCOMPLETE_METADATA, { commandName });
