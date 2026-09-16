import { OPTION_FIELD_METADATA, type OptionFieldMeta } from '@discord.ts/common';
import { optionsDto } from './discord-args.js';
import type {
  AutocompleteEntry,
  ButtonEntry,
  EventEntry,
  Handler,
  MenuEntry,
  ModalEntry,
  SelectEntry,
  SlashEntry,
} from './handler.types.js';

export interface DiscoveryState {
  slash: SlashEntry[];
  menus: MenuEntry[];
  buttons: ButtonEntry[];
  selects: SelectEntry[];
  modals: ModalEntry[];
  autocompletes: AutocompleteEntry[];
  events: EventEntry[];
}

const NAME = /^[\p{Ll}\p{Nd}_-]{1,32}$/u;
const SCALAR = ['string', 'integer', 'number'];

function who(h: Handler): string {
  return `${h.instance.constructor.name}.${h.method}`;
}

function descOk(d: string | undefined): boolean {
  return !!d && d.length >= 1 && d.length <= 100;
}

function flagsKey(m: {
  nsfw?: boolean;
  defaultMemberPermissions?: string | number | bigint | null;
  contexts?: unknown;
  dmPermission?: boolean;
}): string {
  const perms =
    typeof m.defaultMemberPermissions === 'bigint'
      ? m.defaultMemberPermissions.toString()
      : JSON.stringify(m.defaultMemberPermissions ?? null);
  return `${m.nsfw ?? null}|${perms}|${JSON.stringify(m.contexts ?? null)}|${m.dmPermission ?? null}`;
}

function checkOptionField(where: string, key: string, f: OptionFieldMeta, errs: string[]): void {
  const at = `${where}: option "${f.name}" (${key})`;
  if (!NAME.test(f.name)) errs.push(`${at} must be 1-32 lowercase letters, numbers, _ or -`);
  if (!descOk(f.description)) errs.push(`${at} description must be 1-100 chars`);
  if (f.choices?.length) {
    if (!SCALAR.includes(f.kind))
      errs.push(`${at} choices need a string, integer, or number option`);
    if (f.choices.length > 25) errs.push(`${at} holds ${f.choices.length} choices, max 25`);
    for (const c of f.choices) {
      if (!c.name || c.name.length > 100) errs.push(`${at} choice names must be 1-100 chars`);
      if (f.kind === 'string' && (typeof c.value !== 'string' || c.value.length > 100))
        errs.push(`${at} string choices need a string value up to 100 chars`);
      if (f.kind === 'integer' && !Number.isInteger(c.value))
        errs.push(`${at} integer choices need an integer value`);
      if (f.kind === 'number' && (typeof c.value !== 'number' || !Number.isFinite(c.value)))
        errs.push(`${at} number choices need a finite number value`);
    }
  }
  if (f.autocomplete && !SCALAR.includes(f.kind))
    errs.push(`${at} autocomplete needs a string, integer, or number option`);
  if ((f.minLength !== undefined || f.maxLength !== undefined) && f.kind !== 'string')
    errs.push(`${at} min/max length need a string option`);
  if (f.minLength !== undefined && f.minLength < 0) errs.push(`${at} minLength is negative`);
  if (f.maxLength !== undefined && f.maxLength <= 0) errs.push(`${at} maxLength must be positive`);
  if (f.minLength !== undefined && f.maxLength !== undefined && f.minLength > f.maxLength)
    errs.push(`${at} minLength exceeds maxLength`);
  if (
    (f.minValue !== undefined || f.maxValue !== undefined) &&
    !['integer', 'number'].includes(f.kind)
  )
    errs.push(`${at} min/max value need an integer or number option`);
  if (f.minValue !== undefined && f.maxValue !== undefined && f.minValue > f.maxValue)
    errs.push(`${at} minValue exceeds maxValue`);
  if (f.channelTypes !== undefined && f.kind !== 'channel')
    errs.push(`${at} channelTypes need a channel option`);
  if (f.channelTypes !== undefined && !f.channelTypes.length)
    errs.push(`${at} channelTypes is empty`);
}

function checkDto(where: string, s: SlashEntry, errs: string[]): void {
  const Dto = optionsDto(s);
  if (!Dto) return;
  const fields: Record<string, OptionFieldMeta> =
    Reflect.getMetadata(OPTION_FIELD_METADATA, Dto) ?? {};
  const entries = Object.entries(fields);
  if (entries.length > 25) errs.push(`${where} holds ${entries.length} options, max 25`);
  let seenOptional = false;
  for (const [key, f] of entries) {
    if (f.required) {
      if (seenOptional) errs.push(`${where}: required option "${f.name}" follows an optional one`);
    } else seenOptional = true;
    checkOptionField(where, key, f, errs);
  }
}

function checkCustomId(where: string, id: string | RegExp, errs: string[]): void {
  if (typeof id !== 'string') return;
  if (id.length < 1 || id.length > 100) errs.push(`${where} customId must be 1-100 chars`);
}

// ponytail: every Discord rejection we can predict runs here, before any REST call.
export function validateDiscoveryState(s: DiscoveryState): void {
  const errs: string[] = [];
  const slashKeys = new Map<string, string>();
  const tops = new Map<string, { flags: string; hasPlain: boolean; hasSub: boolean }>();
  for (const e of s.slash) {
    const w = who(e);
    const label = e.sub ? `/${e.top} ${e.group ? `${e.group} ` : ''}${e.sub}` : `/${e.top}`;
    if (!NAME.test(e.top))
      errs.push(`${w}: slash name "${e.top}" must be 1-32 lowercase letters, numbers, _ or -`);
    if (!descOk(e.topDescription)) errs.push(`${w}: description of /${e.top} must be 1-100 chars`);
    if (e.sub && !NAME.test(e.sub))
      errs.push(`${w}: subcommand name "${e.sub}" must match ${NAME}`);
    if (e.sub && !descOk(e.subDescription ?? e.sub))
      errs.push(`${w}: description of ${label} must be 1-100 chars`);
    if (e.group && !NAME.test(e.group))
      errs.push(`${w}: group name "${e.group}" must match ${NAME}`);
    const key = `${e.top} ${e.group ?? ''} ${e.sub ?? ''}`;
    const first = slashKeys.get(key);
    if (first) errs.push(`${w}: duplicate ${label} (also in ${first})`);
    else slashKeys.set(key, w);
    const top = tops.get(e.top) ?? { flags: flagsKey(e.flags), hasPlain: false, hasSub: false };
    if (top.flags !== flagsKey(e.flags))
      errs.push(
        `${w}: /${e.top} mixes nsfw/permissions/contexts with ${top.flags ? 'another entry' : 'defaults'}`,
      );
    if (e.sub) top.hasSub = true;
    else top.hasPlain = true;
    tops.set(e.top, top);
    checkDto(w, e, errs);
  }
  for (const [top, t] of tops)
    if (t.hasPlain && t.hasSub) errs.push(`/${top} mixes a plain command with subcommands`);
  for (const m of s.menus) {
    const w = who(m);
    if (!m.name || m.name.length > 32) errs.push(`${w}: menu name must be 1-32 chars`);
    if (m.meta.nsfw !== undefined) errs.push(`${w}: menu nsfw is not sent, remove it`);
  }
  const menuNames = new Map<string, string>();
  for (const m of s.menus) {
    const first = menuNames.get(m.name);
    if (first) errs.push(`${who(m)}: duplicate menu "${m.name}" (also in ${first})`);
    else menuNames.set(m.name, who(m));
  }
  const custom = (label: string, list: (ButtonEntry | SelectEntry | ModalEntry)[]) => {
    for (const h of list) checkCustomId(`${who(h)}: ${label}`, h.customId, errs);
  };
  custom('button', s.buttons);
  custom('select', s.selects);
  custom('modal', s.modals);
  for (const e of s.events) if (!e.event) errs.push(`${who(e)}: event is empty`);
  const topNames = new Set(s.slash.map((e) => e.top));
  for (const a of s.autocompletes)
    if (a.commandName && !topNames.has(a.commandName))
      errs.push(`${who(a)}: autocomplete targets missing command "${a.commandName}"`);
  if (tops.size + s.menus.length > 100)
    errs.push(`app holds ${tops.size + s.menus.length} top-level commands, max 100`);
  if (errs.length)
    throw new Error(
      `[discord.ts] invalid command definitions:\n${errs.map((e) => `- ${e}`).join('\n')}`,
    );
}
