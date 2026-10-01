import {
  INJECT_METADATA,
  runLifecycle,
  type LifecycleHookName,
  type Provider,
  type Type,
  type ValueProvider,
} from '@discord-ts-dev/common';

type Registration = { kind: 'class'; ctor: Type<object> } | { kind: 'value'; value: unknown };

function isValueProvider(provider: Provider): provider is ValueProvider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'provide' in provider &&
    'useValue' in provider
  );
}

function tokenOf(provider: Provider): unknown {
  return isValueProvider(provider) ? provider.provide : provider;
}

function nameOf(token: unknown): string {
  if (typeof token === 'function') return token.name || 'anonymous class';
  return typeof token === 'symbol' ? token.toString() : String(token);
}

/**
 * Collect the hook failures into one throw. The causes go in the message, not
 * only in `.errors`, because the caller is a signal handler that logs
 * `err.message` and nothing else — a bare count would leave the operator with
 * no idea which provider broke.
 */
function lifecycleError(phase: string, errors: Error[]): AggregateError {
  return new AggregateError(
    errors,
    `${phase}: ${errors.length} lifecycle hook(s) failed — ${errors.map((e) => e.message).join('; ')}`,
  );
}

/**
 * Constructs every provider once, in declaration order, resolving each
 * constructor's `@Inject()` tokens first. Guards missing from the provider
 * list are constructed on first use. Unknown tokens, duplicate providers, and
 * dependency cycles fail loudly.
 */
export class ProviderRegistry {
  private readonly registrations = new Map<unknown, Registration>();
  private readonly instances = new Map<unknown, object>();
  private readonly scannable: object[] = [];
  private readonly resolving = new Set<unknown>();
  private lifecycleRan = false;
  private shutdownRan = false;

  constructor(providers: Provider[]) {
    for (const provider of providers) {
      const token = tokenOf(provider);
      if (this.registrations.has(token)) throw new Error(`duplicate provider: ${nameOf(token)}`);
      this.registrations.set(
        token,
        isValueProvider(provider)
          ? { kind: 'value', value: provider.useValue }
          : { kind: 'class', ctor: provider },
      );
    }
    for (const token of this.registrations.keys()) this.resolve(token);
  }

  /** Provider instances in construction order, for Discovery to scan. */
  list(): object[] {
    return [...this.scannable];
  }

  resolve<T extends object>(token: Type<T>): T;
  resolve<T>(token: T): T;
  resolve<T>(token: T): T {
    const registration = this.registrations.get(token);
    if (!registration) throw new Error(`missing provider for token ${nameOf(token)}`);
    const found = this.instances.get(token);
    if (found) return found as T;
    if (registration.kind === 'value') {
      this.instances.set(token, registration.value as object);
      return registration.value as T;
    }
    return this.construct(registration.ctor) as T;
  }

  /** Resolve a registered provider, or construct the class and register it. */
  resolveOrCreate<T extends object>(ctor: Type<T>): T {
    if (!this.registrations.has(ctor)) this.registrations.set(ctor, { kind: 'class', ctor });
    return this.resolve(ctor) as T;
  }

  /**
   * Run `onModuleInit` across every constructed provider, in construction
   * order, and throw if any failed. Called by `createRuntime` once the graph is
   * built, so a provider that needs a database connects after its dependencies
   * exist rather than in its constructor.
   *
   * Idempotent: a provider added after the first call still gets its hook.
   */
  async onModuleInit(): Promise<void> {
    const errors = await this.runHooks('onModuleInit', this.scannable);
    if (errors.length) throw lifecycleError('onModuleInit', errors);
    this.lifecycleRan = true;
  }

  /**
   * Run `onApplicationBootstrap` across every constructed provider, in
   * construction order, and throw if any failed. Called by `createRuntime`
   * after discovery has scanned and routing has subscribed, so a provider may
   * assume the bot shape exists rather than just live dependencies.
   */
  async onApplicationBootstrap(): Promise<void> {
    const errors = await this.runHooks('onApplicationBootstrap', this.scannable);
    if (errors.length) throw lifecycleError('onApplicationBootstrap', errors);
  }

  /**
   * Teardown, in reverse construction order so dependents go before their
   * dependencies: `onModuleDestroy` first, then `onApplicationShutdown` with the
   * Discord client still up. Runs every hook even after one fails, then throws
   * the collected errors together.
   *
   * Idempotent, and safe to call when `onModuleInit` never ran.
   */
  async shutdown(): Promise<void> {
    if (this.shutdownRan) return;
    this.shutdownRan = true;
    const reverse = [...this.scannable].reverse();
    const errors = [
      ...(await this.runHooks('onModuleDestroy', reverse)),
      ...(await this.runHooks('onApplicationShutdown', reverse)),
    ];
    if (errors.length) throw lifecycleError('shutdown', errors);
  }

  /** True once `onModuleInit` has run — for tests and for skipping work at boot. */
  get initialized(): boolean {
    return this.lifecycleRan;
  }

  private async runHooks(name: LifecycleHookName, instances: readonly object[]): Promise<Error[]> {
    return runLifecycle(instances, name);
  }

  private construct(ctor: Type<object>): object {
    if (this.resolving.has(ctor)) throw new Error(`cyclic provider dependency at ${nameOf(ctor)}`);
    this.resolving.add(ctor);
    try {
      const tokens: Record<number, unknown> = Reflect.getMetadata(INJECT_METADATA, ctor) ?? {};
      const args: unknown[] = [];
      for (const [index, token] of Object.entries(tokens))
        args[Number(index)] = this.resolve(token);
      const instance = new (ctor as new (...a: unknown[]) => object)(...args);
      this.instances.set(ctor, instance);
      this.scannable.push(instance);
      return instance;
    } finally {
      this.resolving.delete(ctor);
    }
  }
}
