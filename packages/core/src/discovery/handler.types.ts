import type { ApplicationCommandType, LocalizationMap } from 'discord.js';
import type { CommandFlags, ContextMenuMeta } from '@discord.ts/common';

export interface Handler {
  instance: Record<string, (...args: never[]) => unknown>;
  method: string;
}

export interface LocalizationPair {
  name?: LocalizationMap;
  description?: LocalizationMap;
}

export interface SlashEntry extends Handler {
  top: string;
  topDescription: string;
  topLocalizations?: LocalizationPair;
  group?: string;
  groupDescription?: string;
  groupLocalizations?: LocalizationPair;
  sub?: string;
  subDescription?: string;
  subLocalizations?: LocalizationPair;
  flags: CommandFlags;
}

export interface MenuEntry extends Handler {
  name: string;
  type: ApplicationCommandType.User | ApplicationCommandType.Message;
  meta: ContextMenuMeta;
}

export interface ButtonEntry extends Handler {
  customId: string | RegExp;
}

export interface SelectEntry extends Handler {
  kind: string;
  customId: string | RegExp;
}

export interface ModalEntry extends Handler {
  customId: string | RegExp;
}

export interface AutocompleteEntry extends Handler {
  commandName?: string;
}

export interface EventEntry extends Handler {
  event: string;
  once: boolean;
}

export function matches(id: string | RegExp, value: string): boolean {
  return typeof id === 'string' ? id === value : id.test(value);
}
