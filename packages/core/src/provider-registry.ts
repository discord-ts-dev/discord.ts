import { INJECT_METADATA, type Provider, type Type, type ValueProvider } from '@discord.ts/common';

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
