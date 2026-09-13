import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import { PARAM_PREFIX_ARGS_METADATA, PREFIX_COMMAND_METADATA } from '../constants';

export interface PrefixCommandMeta {
  name: string;
  aliases?: string[];
  description?: string;
}

// ponytail: method-level, same shape as SlashCommand
export const PrefixCommand = (meta: PrefixCommandMeta): MethodDecorator =>
  SetMetadata(PREFIX_COMMAND_METADATA, meta);

function pushArgMeta(target: object, method: string | symbol | undefined, index: number) {
  if (method === undefined) return;
  const fn = (target as Record<string | symbol, object>)[method] as object;
  const R = Reflect as unknown as {
    getMetadata(key: string, t: object): number[] | undefined;
    defineMetadata(key: string, v: unknown, t: object): void;
  };
  const existing = R.getMetadata(PARAM_PREFIX_ARGS_METADATA, fn) ?? [];
  R.defineMetadata(PARAM_PREFIX_ARGS_METADATA, [...existing, index], fn);
}

/** Raw string[] args after the command name. Quoted strings stay together. */
export function PrefixArgs(): ParameterDecorator {
  return (target, key, index) => pushArgMeta(target, key, index);
}
