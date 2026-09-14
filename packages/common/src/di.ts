import 'reflect-metadata';
import { GUARDS_METADATA, PIPES_METADATA } from './constants.js';

export type Type<T = unknown> = new (...args: never[]) => T;

export const MODULE_METADATA = 'discord:module';

export function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('discord:injectable', true, target);
  };
}

export function Module(meta: { imports?: unknown[]; providers?: Type[] }): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MODULE_METADATA, meta, target);
  };
}

// ponytail: compat no-op, container wires known services manually
export function Inject(_token: unknown): ParameterDecorator {
  return () => {};
}

export function SetMetadata(key: string, value: unknown): MethodDecorator & ClassDecorator {
  const dec = (
    target: object,
    key2?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): unknown => {
    if (descriptor) {
      Reflect.defineMetadata(key, value, descriptor.value as object);
      return descriptor;
    }
    if (key2 !== undefined) {
      const fn = (target as Record<string | symbol, unknown>)[key2];
      if (typeof fn === 'function') Reflect.defineMetadata(key, value, fn as object);
      return;
    }
    Reflect.defineMetadata(key, value, target);
  };
  return dec as unknown as MethodDecorator & ClassDecorator;
}

export function applyDecorators(
  ...decs: Array<MethodDecorator & ClassDecorator>
): MethodDecorator & ClassDecorator {
  return ((target: object, key?: string | symbol, desc?: PropertyDescriptor): unknown => {
    let d: PropertyDescriptor | undefined = desc;
    for (const dec of decs) {
      const r = (
        dec as unknown as (t: object, k?: string | symbol, dd?: PropertyDescriptor) => unknown
      )(target, key, d);
      if (r && d) d = r as PropertyDescriptor;
    }
    return (d ?? target) as unknown;
  }) as unknown as MethodDecorator & ClassDecorator;
}

function appendMeta(key: string, values: unknown[]): MethodDecorator & ClassDecorator {
  return ((target: object, key2?: string | symbol, desc?: PropertyDescriptor): unknown => {
    if (desc) {
      const prev: unknown[] = Reflect.getMetadata(key, desc.value as object) ?? [];
      Reflect.defineMetadata(key, [...prev, ...values], desc.value as object);
      return desc;
    }
    if (key2 !== undefined) {
      const fn = (target as Record<string | symbol, unknown>)[key2];
      const prev: unknown[] = Reflect.getMetadata(key, fn as object) ?? [];
      Reflect.defineMetadata(key, [...prev, ...values], fn as object);
      return;
    }
    const prev: unknown[] = Reflect.getMetadata(key, target) ?? [];
    Reflect.defineMetadata(key, [...prev, ...values], target);
  }) as unknown as MethodDecorator & ClassDecorator;
}

export function UseGuards(...guards: unknown[]): MethodDecorator & ClassDecorator {
  return appendMeta(GUARDS_METADATA, guards);
}

export function UsePipes(...pipes: unknown[]): MethodDecorator & ClassDecorator {
  return appendMeta(PIPES_METADATA, pipes);
}

export interface CanActivate {
  canActivate(context: unknown): boolean | Promise<boolean>;
}

export class Reflector {
  get<T>(key: string, target: object): T | undefined {
    return Reflect.getMetadata(key, target) as T | undefined;
  }

  getAllAndOverride<T>(key: string, targets: object[]): T | undefined {
    for (const t of targets) {
      if (!t) continue;
      const v = Reflect.getMetadata(key, t) as T | undefined;
      if (v !== undefined) return v;
    }
    return undefined;
  }
}

// ponytail: minimal Logger for example bots, DiscordLogger stays canonical in core
export class Logger {
  constructor(private readonly context?: string) {}

  log(message?: unknown, ...args: unknown[]): void {
    process.stdout.write(
      `[${this.context ?? 'App'}] ${String(message)} ${args.map(String).join(' ')}\n`,
    );
  }

  error(message?: unknown, ...args: unknown[]): void {
    console.error(`[${this.context ?? 'App'}]`, message, ...args);
  }

  warn(message?: unknown, ...args: unknown[]): void {
    console.warn(`[${this.context ?? 'App'}]`, message, ...args);
  }

  debug(message?: unknown, ..._args: unknown[]): void {
    void _args;
    if (process.env.DISCORD_DEBUG === 'true')
      process.stdout.write(`[${this.context ?? 'App'}] ${String(message)}\n`);
  }
}
