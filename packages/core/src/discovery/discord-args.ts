import type { SlashCommandBuilder } from 'discord.js';
import {
  OPTION_FIELD_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_OPTIONS_METADATA,
  PARAM_PREFIX_ARGS_METADATA,
  type OptionFieldMeta,
} from '@discord.ts/common';
import type { Handler } from './handler.types.js';

// ponytail: pure arg building, no DI. Shared by routing; optionsDto by discovery JSON.
export function optionsDto(h: Handler): (new () => Record<string, unknown>) | undefined {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  if (typeof fn !== 'function') return undefined;
  const idxs: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
  if (!idxs.length) return undefined;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  return types[idxs[0]] as new () => Record<string, unknown>;
}

export function buildArgs(h: Handler, interaction: unknown, prefixArgs?: string[]): unknown[] {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  const args: unknown[] = new Array(types.length).fill(undefined);
  const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
  const optIdx: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
  const argIdx: number[] = Reflect.getMetadata(PARAM_PREFIX_ARGS_METADATA, fn) ?? [];
  for (const i of ctxIdx) args[i] = interaction;
  for (const i of optIdx) {
    const Dto = (types[i] ?? Object) as new () => Record<string, unknown>;
    args[i] =
      prefixArgs !== undefined ? buildDtoFromArgs(Dto, prefixArgs) : buildDto(Dto, interaction);
  }
  for (const i of argIdx) args[i] = prefixArgs ?? [];
  // No decorators: pass interaction as single arg (lazy default)
  if (!ctxIdx.length && !optIdx.length && !argIdx.length && types.length) args[0] = interaction;
  return args;
}

export function buildDto(
  Dto: new () => Record<string, unknown>,
  interaction: unknown,
): Record<string, unknown> {
  const dto = new Dto();
  const fields: Record<string, OptionFieldMeta> =
    Reflect.getMetadata(OPTION_FIELD_METADATA, Dto) ?? {};
  const opts = (
    interaction as { options?: Record<string, (n: string) => { value?: unknown } | null> }
  ).options;
  if (!opts) return dto;
  const getters: Record<OptionFieldMeta['kind'], string> = {
    string: 'getString',
    integer: 'getInteger',
    number: 'getNumber',
    boolean: 'getBoolean',
    user: 'getUser',
    channel: 'getChannel',
    role: 'getRole',
    mentionable: 'getMentionable',
    attachment: 'getAttachment',
  };
  for (const [key, f] of Object.entries(fields)) {
    try {
      const get = (opts as unknown as Record<string, (n: string) => unknown>)[getters[f.kind]];
      if (typeof get === 'function')
        dto[key] = (get as (n: string) => unknown).call(opts, f.name) as unknown;
    } catch {
      dto[key] = undefined;
    }
  }
  return dto;
}

export function buildEventArgs(h: Handler, raw: unknown[]): unknown[] {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
  const args: unknown[] = new Array(Math.max(types.length, raw.length)).fill(undefined);
  raw.forEach((v, i) => {
    args[i] = v;
  });
  for (const i of ctxIdx) args[i] = raw[0];
  return args;
}

// ponytail: prefix surface fills DTO positionally, then the same validate pipeline runs.
// Trailing free text joins into a final string field, so `!warn @u spamming links` works unquoted.
// Mention syntax coerces to ids for user/role/channel kinds; full User fetch stays in handlers.
export function buildDtoFromArgs(
  Dto: new () => Record<string, unknown>,
  args: string[],
): Record<string, unknown> {
  const dto = new Dto();
  const fields: Record<string, OptionFieldMeta> =
    Reflect.getMetadata(OPTION_FIELD_METADATA, Dto) ?? {};
  const entries = Object.entries(fields);
  entries.forEach(([key, f], i) => {
    if (i === entries.length - 1 && f.kind === 'string' && args.length > entries.length)
      dto[key] = args.slice(i).join(' ');
    else dto[key] = coerceArg(f, args[i]);
  });
  return dto;
}

/** Extract a Discord id from mention syntax or a raw id. Returns undefined when not id-like. */
export function parseMentionId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^<@!?(\d+)>$/) ?? raw.match(/^<@&(\d+)>$/) ?? raw.match(/^<#(\d+)>$/);
  if (m) return m[1];
  return /^\d+$/.test(raw) ? raw : undefined;
}

function coerceArg(f: OptionFieldMeta, raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  if (f.kind === 'integer') return /^-?\d+$/.test(raw) ? Number.parseInt(raw, 10) : raw;
  if (f.kind === 'number') {
    const n = Number(raw);
    return raw.trim() !== '' && Number.isFinite(n) ? n : raw;
  }
  if (f.kind === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : raw;
  if (f.kind === 'user' || f.kind === 'mentionable' || f.kind === 'role' || f.kind === 'channel')
    return parseMentionId(raw) ?? raw;
  return raw;
}

type OptionBuilder = Pick<
  SlashCommandBuilder,
  | 'addStringOption'
  | 'addIntegerOption'
  | 'addNumberOption'
  | 'addBooleanOption'
  | 'addUserOption'
  | 'addChannelOption'
  | 'addRoleOption'
  | 'addMentionableOption'
  | 'addAttachmentOption'
>;

// ponytail: extras mirror builder setters; limits are checked at boot by the validator.
export function applyOptions(
  b: OptionBuilder,
  dto?: (new () => Record<string, unknown>) | undefined,
): void {
  if (!dto) return;
  const fields: Record<string, OptionFieldMeta> =
    Reflect.getMetadata(OPTION_FIELD_METADATA, dto) ?? {};
  for (const f of Object.values(fields)) {
    const base = (o: {
      setName(n: string): unknown;
      setDescription(d: string): unknown;
      setRequired(r: boolean): unknown;
    }): void => {
      o.setName(f.name);
      o.setDescription(f.description);
      o.setRequired(!!f.required);
    };
    if (f.kind === 'string')
      b.addStringOption((o) => {
        base(o);
        if (f.autocomplete !== undefined) o.setAutocomplete(f.autocomplete);
        if (f.choices?.length)
          o.addChoices(...f.choices.map((c) => ({ name: c.name, value: String(c.value) })));
        if (f.minLength !== undefined) o.setMinLength(f.minLength);
        if (f.maxLength !== undefined) o.setMaxLength(f.maxLength);
        return o;
      });
    else if (f.kind === 'integer' || f.kind === 'number') {
      const num = (o: {
        setAutocomplete(b: boolean): unknown;
        addChoices(...c: { name: string; value: number }[]): unknown;
        setMinValue(n: number): unknown;
        setMaxValue(n: number): unknown;
      }): void => {
        if (f.autocomplete !== undefined) o.setAutocomplete(f.autocomplete);
        if (f.choices?.length)
          o.addChoices(...f.choices.map((c) => ({ name: c.name, value: Number(c.value) })));
        if (f.minValue !== undefined) o.setMinValue(f.minValue);
        if (f.maxValue !== undefined) o.setMaxValue(f.maxValue);
      };
      if (f.kind === 'integer')
        b.addIntegerOption((o) => {
          base(o);
          num(o);
          return o;
        });
      else
        b.addNumberOption((o) => {
          base(o);
          num(o);
          return o;
        });
    } else if (f.kind === 'boolean')
      b.addBooleanOption((o) => {
        base(o);
        return o;
      });
    else if (f.kind === 'user')
      b.addUserOption((o) => {
        base(o);
        return o;
      });
    else if (f.kind === 'channel')
      b.addChannelOption((o) => {
        base(o);
        if (f.channelTypes?.length) o.addChannelTypes(...f.channelTypes);
        return o;
      });
    else if (f.kind === 'role')
      b.addRoleOption((o) => {
        base(o);
        return o;
      });
    else if (f.kind === 'mentionable')
      b.addMentionableOption((o) => {
        base(o);
        return o;
      });
    else
      b.addAttachmentOption((o) => {
        base(o);
        return o;
      });
  }
}
