import 'reflect-metadata';
import { GUARDS_METADATA, INJECT_METADATA, PIPES_METADATA } from './constants.js';

export type Type<T = unknown> = new (...args: never[]) => T;

/** A literal value registered under a token, e.g. an app's Store adapter. */
export interface ValueProvider {
  provide: unknown;
  useValue: unknown;
}

/** A class the registry constructs, or a value it hands out as-is. */
export type Provider = Type<object> | ValueProvider;

export const MODULE_METADATA = 'discord:module';

export function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('discord:injectable', true, target);
  };
}

export function Module(meta: { imports?: unknown[]; providers?: Provider[] }): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MODULE_METADATA, meta, target);
  };
}

/**
 * Declare the token a constructor parameter resolves from. The provider
 * registry reads the tokens recorded on the class; a parameter without
 * `@Inject()` is not injected.
 */
export function Inject(token: unknown): ParameterDecorator {
  return (target, _key, index) => {
    const prev: Record<number, unknown> = Reflect.getMetadata(INJECT_METADATA, target) ?? {};
    Reflect.defineMetadata(INJECT_METADATA, { ...prev, [index]: token }, target);
  };
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

/**
 * Lifecycle hooks. A provider opts in by naming one of these methods; there is
 * no decorator and no base class to extend, so an existing class can gain one
 * without changing anything else about it.
 *
 * `onModuleInit` runs after every provider is constructed, in construction
 * order, so a provider may assume its own dependencies are already live. Use it
 * to acquire something the constructor must not do — an advisory notes: for a
 * database the constructor is wrong anyway, because a bad `DATABASE_URL` should
 * not stop the process from booting.
 *
 * `onApplicationBootstrap` runs after discovery has scanned providers and
 * routing has subscribed, still in construction order, so a provider may assume
 * the bot shape exists. Use it for work that needs commands and routing to be
 * up — scheduling jobs, hydrating caches — rather than just live dependencies.
 * It runs in `createRuntime`, so `deployWithModule` runs it too: hooks must be
 * deploy-safe.
 *
 * Shutdown runs in reverse construction order, so dependents die before the
 * things they depend on. `onModuleDestroy` is for releasing a provider's own
 * resources; `onApplicationShutdown` is the last thing that runs, with the
 * Discord client still connected, for anything that needs to talk to Discord
 * one final time.
 */
export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}

export interface OnApplicationBootstrap {
  onApplicationBootstrap(): void | Promise<void>;
}

export interface OnModuleDestroy {
  onModuleDestroy(): void | Promise<void>;
}

export interface OnApplicationShutdown {
  onApplicationShutdown(): void | Promise<void>;
}

/** Duck-typed so a provider needs no import to participate. */
const hasHook = (instance: object, name: string): boolean =>
  typeof (instance as Record<string, unknown>)[name] === 'function';

/** Every lifecycle hook name, in firing order. */
export type LifecycleHookName =
  | 'onModuleInit'
  | 'onApplicationBootstrap'
  | 'onModuleDestroy'
  | 'onApplicationShutdown';

/**
 * Run one lifecycle hook across instances. Failures are collected rather than
 * thrown on the first one, so one broken provider cannot silently strand the
 * rest of teardown — the caller gets every error at once.
 */
export async function runLifecycle(
  instances: readonly object[],
  name: LifecycleHookName,
): Promise<Error[]> {
  const errors: Error[] = [];
  for (const instance of instances) {
    if (!hasHook(instance, name)) continue;
    try {
      // Sequential on purpose. The order hooks run in is the contract: a
      // dependency's `onModuleInit` has to land before its consumer's, and
      // teardown reverses it. `Promise.all` would be faster and wrong, so the
      // lint rule is disabled rather than obeyed.
      // oxlint-disable-next-line no-await-in-loop
      await (instance as unknown as Record<string, () => unknown>)[name]();
    } catch (err) {
      const where = instance.constructor?.name ?? 'anonymous provider';
      errors.push(new Error(`${name} failed on ${where}: ${(err as Error).message}`));
    }
  }
  return errors;
}

export class Reflector {
  constructor() {}
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
