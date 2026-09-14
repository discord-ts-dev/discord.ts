import 'reflect-metadata';
import {
  PARAM_AUTHOR_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_GUILD_METADATA,
  PARAM_OPTIONS_METADATA,
} from '../constants.js';

type R = {
  getMetadata(key: string, target: object): number[] | undefined;
  defineMetadata(key: string, value: unknown, target: object): void;
};
const R = Reflect as unknown as R;

function pushParamMeta(
  key: string,
  target: object,
  method: string | symbol | undefined,
  index: number,
) {
  if (method === undefined) return;
  const fn = (target as Record<string | symbol, object>)[method] as object;
  const existing: number[] = R.getMetadata(key, fn) ?? [];
  R.defineMetadata(key, [...existing, index], fn);
}

// ponytail: index lists, no ExecutionContext wrapper needed at decorate time
export function Context(): ParameterDecorator {
  return (target, key, index) => pushParamMeta(PARAM_CONTEXT_METADATA, target, key, index);
}

export function Options(): ParameterDecorator {
  return (target, key, index) => pushParamMeta(PARAM_OPTIONS_METADATA, target, key, index);
}

// ponytail: derived params, resolved from the interaction/message in core.
// Guild is null outside guilds; Author is message.author ?? interaction.user.
export function Guild(): ParameterDecorator {
  return (target, key, index) => pushParamMeta(PARAM_GUILD_METADATA, target, key, index);
}

export function Author(): ParameterDecorator {
  return (target, key, index) => pushParamMeta(PARAM_AUTHOR_METADATA, target, key, index);
}
