import type { LocalizationMap, SlashCommandBuilder } from 'discord.js';
import {
  OPTION_FIELD_METADATA,
  PARAM_AUTHOR_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_GUILD_METADATA,
  PARAM_LOCALE_METADATA,
  PARAM_OPTIONS_METADATA,
  type OptionFieldMeta,
} from '@discord.ts/common';
import { resolveLocale } from '@discord.ts/i18n';
import { applyLocalizations, localizedPair } from './discord-localize.js';
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

export function buildArgs(h: Handler, interaction: unknown, i18nDefault?: string): unknown[] {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  const args: unknown[] = new Array(types.length).fill(undefined);
  const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
  const optIdx: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
  const guildIdx: number[] = Reflect.getMetadata(PARAM_GUILD_METADATA, fn) ?? [];
  const authorIdx: number[] = Reflect.getMetadata(PARAM_AUTHOR_METADATA, fn) ?? [];
  const localeIdx: number[] = Reflect.getMetadata(PARAM_LOCALE_METADATA, fn) ?? [];
  for (const i of ctxIdx) args[i] = interaction;
  for (const i of optIdx) {
    const Dto = (types[i] ?? Object) as new () => Record<string, unknown>;
    args[i] = buildDto(Dto, interaction);
  }
  for (const i of guildIdx) args[i] = resolveGuild(interaction);
  for (const i of authorIdx) args[i] = resolveAuthor(interaction);
  for (const i of localeIdx) args[i] = resolveLocale(interaction, i18nDefault);
  // No decorators: pass interaction as single arg (lazy default)
  if (
    !ctxIdx.length &&
    !optIdx.length &&
    !guildIdx.length &&
    !authorIdx.length &&
    !localeIdx.length &&
    types.length
  )
    args[0] = interaction;
  return args;
}

// ponytail: structural reads, works for interactions, messages, and selects.
export function resolveGuild(source: unknown): unknown {
  return (source as { guild?: unknown }).guild ?? null;
}

export function resolveAuthor(source: unknown): unknown {
  const rec = source as { author?: unknown; user?: unknown };
  return rec.author ?? rec.user ?? null;
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

export function buildEventArgs(h: Handler, raw: unknown[], i18nDefault?: string): unknown[] {
  const fn = h.instance[h.method] as (...a: never[]) => unknown;
  const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
  const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
  const guildIdx: number[] = Reflect.getMetadata(PARAM_GUILD_METADATA, fn) ?? [];
  const authorIdx: number[] = Reflect.getMetadata(PARAM_AUTHOR_METADATA, fn) ?? [];
  const localeIdx: number[] = Reflect.getMetadata(PARAM_LOCALE_METADATA, fn) ?? [];
  const args: unknown[] = new Array(Math.max(types.length, raw.length)).fill(undefined);
  raw.forEach((v, i) => {
    args[i] = v;
  });
  for (const i of ctxIdx) args[i] = raw[0];
  const head = raw[0];
  for (const i of guildIdx) if (args[i] === undefined) args[i] = resolveGuild(head);
  for (const i of authorIdx) if (args[i] === undefined) args[i] = resolveAuthor(head);
  for (const i of localeIdx) if (args[i] === undefined) args[i] = resolveLocale(head, i18nDefault);
  return args;
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
  keyBase?: string,
): void {
  if (!dto) return;
  const fields: Record<string, OptionFieldMeta> =
    Reflect.getMetadata(OPTION_FIELD_METADATA, dto) ?? {};
  for (const f of Object.values(fields)) {
    const loc = localizedPair(keyBase ? `${keyBase}.options.${f.name}` : undefined, {
      name: f.nameLocalizations,
      description: f.descriptionLocalizations,
    });
    const base = (o: {
      setName(n: string): unknown;
      setDescription(d: string): unknown;
      setRequired(r: boolean): unknown;
      setNameLocalizations(l: LocalizationMap | null): unknown;
      setDescriptionLocalizations(l: LocalizationMap | null): unknown;
    }): void => {
      o.setName(f.name);
      o.setDescription(f.description);
      o.setRequired(!!f.required);
      applyLocalizations(o, loc);
    };
    if (f.kind === 'string')
      b.addStringOption((o) => {
        base(o);
        if (f.autocomplete !== undefined) o.setAutocomplete(f.autocomplete);
        if (f.choices?.length)
          o.addChoices(
            ...f.choices.map((c) => ({
              name: c.name,
              value: String(c.value),
              ...(c.nameLocalizations ? { name_localizations: c.nameLocalizations } : {}),
            })),
          );
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
          o.addChoices(
            ...f.choices.map((c) => ({
              name: c.name,
              value: Number(c.value),
              ...(c.nameLocalizations ? { name_localizations: c.nameLocalizations } : {}),
            })),
          );
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
