import {
  OPTION_FIELD_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_OPTIONS_METADATA,
  PARAM_PREFIX_ARGS_METADATA,
  type OptionFieldMeta,
} from '@discord-ts/common';
import type { Handler } from './handler.types';

// ponytail: pure arg building, no DI. Shared by routing; optionsDto by discovery JSON.
export function optionsDto(h: Handler): (new () => Record<string, unknown>) | undefined {
  const idxs: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, h.instance[h.method]) ?? [];
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
    args[i] = buildDto(Dto, interaction);
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
