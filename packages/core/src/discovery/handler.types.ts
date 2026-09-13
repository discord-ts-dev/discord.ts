import type { ApplicationCommandType } from 'discord.js';

export interface Handler {
  instance: Record<string, (...args: never[]) => unknown>;
  method: string;
}

export interface SlashEntry extends Handler {
  top: string;
  topDescription: string;
  group?: string;
  sub?: string;
  subDescription?: string;
}

export interface MenuEntry extends Handler {
  name: string;
  type: ApplicationCommandType.User | ApplicationCommandType.Message;
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

export interface PrefixEntry extends Handler {
  name: string;
  aliases: string[];
}

export function matches(id: string | RegExp, value: string): boolean {
  return typeof id === 'string' ? id === value : id.test(value);
}

/** Split on spaces, keep "quoted parts" together. */
export function splitArgs(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out.filter((s) => s.length > 0);
}
