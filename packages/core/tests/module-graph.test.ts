import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, expect, test } from 'bun:test';
import {
  Inject,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@discord-ts-dev/common';
import { ProviderRegistry, collectModuleProviders } from '../src/index.js';

describe('collectModuleProviders', () => {
  test('collects a module listed in imports — the case that used to fail at boot', () => {
    class PrismaService {}
    @Module({ providers: [PrismaService] })
    class PrismaModule {}
    @Module({ imports: [PrismaModule] })
    class AppModule {}

    // `imports` used to be read only to find the DiscordModule def, so this
    // returned [] and the app died at login with `missing provider for token
    // PrismaService` — after tsc, the build and every other test had passed.
    assert.deepEqual(collectModuleProviders(AppModule), [PrismaService]);
  });

  test('orders an imported module before the module that uses it', () => {
    class Dep {}
    class UsesDep {
      constructor(@Inject(Dep) readonly dep: Dep) {}
    }
    @Module({ providers: [Dep] })
    class DepModule {}
    @Module({ imports: [DepModule], providers: [UsesDep] })
    class AppModule {}

    const registry = new ProviderRegistry(collectModuleProviders(AppModule));
    assert.equal(registry.resolve(UsesDep).dep, registry.resolve(Dep));
  });

  test('walks a nested graph depth-first', () => {
    class A {}
    class B {}
    class C {}
    @Module({ providers: [A] })
    class Inner {}
    @Module({ imports: [Inner], providers: [B] })
    class Middle {}
    @Module({ imports: [Middle], providers: [C] })
    class AppModule {}

    assert.deepEqual(collectModuleProviders(AppModule), [A, B, C]);
  });

  test('collects a diamond once per module', () => {
    class Shared {}
    @Module({ providers: [Shared] })
    class Left {}
    @Module({ providers: [Shared] })
    class Right {}
    // A module *listed twice* is not a duplicate provider and must not be.
    @Module({ imports: [Left, Left] })
    class Twice {}
    assert.deepEqual(collectModuleProviders(Twice), [Shared]);

    // Two modules declaring the same provider is a genuine duplicate, and the
    // registry is what reports it.
    @Module({ imports: [Left, Right] })
    class Diamond {}
    assert.throws(
      () => new ProviderRegistry(collectModuleProviders(Diamond)),
      /duplicate provider: Shared/,
    );
  });

  test('terminates on an import cycle instead of recursing forever', () => {
    class Svc {}
    @Module({ providers: [Svc] })
    class A {
      // declared after the fact to build the cycle
    }
    const B = class {
      static moduleMeta = null;
    };
    Reflect.defineMetadata(
      'discord:module',
      { imports: [A], providers: [] },
      B as unknown as object,
    );
    Reflect.defineMetadata('discord:module', { imports: [B], providers: [Svc] }, A);
    assert.deepEqual(collectModuleProviders(B as unknown as never), [Svc]);
  });

  test('skips forRoot defs, nulls and non-modules in imports', () => {
    class App {}
    class FakeModule {}
    Module({ imports: [null, { module: FakeModule }, 42, 'x'] })(App);
    assert.deepEqual(collectModuleProviders(App), []);
  });

  test('a module with no imports collects exactly what it declares', () => {
    class One {}
    @Module({ providers: [One] })
    class App {}
    assert.deepEqual(collectModuleProviders(App), [One]);
  });
});

describe('lifecycle hooks', () => {
  const withHooks = (log: string[], name: string) =>
    class implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
      constructor() {
        log.push(`ctor:${name}`);
      }
      onModuleInit() {
        log.push(`init:${name}`);
      }
      onModuleDestroy() {
        log.push(`destroy:${name}`);
      }
      onApplicationShutdown() {
        log.push(`shutdown:${name}`);
      }
    };

  test('onModuleInit runs after every construction, in construction order', async () => {
    const log: string[] = [];
    const A = withHooks(log, 'a');
    const B = withHooks(log, 'b');
    const C = withHooks(log, 'c');
    // No injection edges between these, so construction order is declaration
    // order. The contract under test is that construction finishes first, and
    // that init then follows the same order the scan list recorded.
    const registry = new ProviderRegistry([A, B, C]);
    await registry.onModuleInit();
    assert.deepEqual(log, ['ctor:a', 'ctor:b', 'ctor:c', 'init:a', 'init:b', 'init:c']);
    assert.equal(registry.initialized, true);
  });

  test('a dependency initialises before its consumer', async () => {
    const log: string[] = [];
    class Dep {
      onModuleInit() {
        log.push('dep:init');
      }
    }
    class User {
      constructor(@Inject(Dep) readonly dep: Dep) {}
      onModuleInit() {
        log.push('user:init');
      }
    }
    await new ProviderRegistry([User, Dep]).onModuleInit();
    assert.deepEqual(log, ['dep:init', 'user:init']);
  });

  test('shutdown destroys in reverse construction order, then runs application shutdown', async () => {
    const log: string[] = [];
    // User injects Dep, so Dep is constructed first and lands first in the scan
    // list; reverse order therefore tears down the consumer before its
    // dependency. Two classes with no edge between them would construct in
    // declaration order and this assertion would be meaningless.
    class Dep implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
      onModuleInit() {
        log.push('init:dep');
      }
      onModuleDestroy() {
        log.push('destroy:dep');
      }
      onApplicationShutdown() {
        log.push('shutdown:dep');
      }
    }
    class User implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
      constructor(@Inject(Dep) readonly dep: Dep) {}
      onModuleInit() {
        log.push('init:user');
      }
      onModuleDestroy() {
        log.push('destroy:user');
      }
      onApplicationShutdown() {
        log.push('shutdown:user');
      }
    }
    const registry = new ProviderRegistry([User, Dep]);
    await registry.onModuleInit();
    assert.deepEqual(log, ['init:dep', 'init:user'], 'dep must init before its consumer');

    log.length = 0;
    await registry.shutdown();
    assert.deepEqual(log, ['destroy:user', 'destroy:dep', 'shutdown:user', 'shutdown:dep']);
  });

  test('is idempotent and safe out of order', async () => {
    const log: string[] = [];
    const Dep = withHooks(log, 'dep');
    const registry = new ProviderRegistry([Dep]);
    // Shutdown before init must not throw, and must run exactly once.
    await registry.shutdown();
    await registry.shutdown();
    assert.deepEqual(log, ['ctor:dep', 'destroy:dep', 'shutdown:dep']);
  });

  test('runs every hook after one throws, then reports all failures', async () => {
    const log: string[] = [];
    class Boom {
      onModuleInit() {
        throw new Error('nope');
      }
    }
    class Fine {
      onModuleInit() {
        log.push('fine ran');
      }
    }
    const registry = new ProviderRegistry([Boom, Fine]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(registry.onModuleInit()).rejects.toThrow('onModuleInit failed on Boom: nope');
    assert.deepEqual(log, ['fine ran'], 'a broken provider must not strand the rest');
  });

  test('shutdown reports a hook failure without skipping the client teardown path', async () => {
    class Bad {
      onModuleDestroy() {
        throw new Error('disconnect failed');
      }
    }
    const registry = new ProviderRegistry([Bad]);
    await expect(registry.shutdown()).rejects.toThrow(/disconnect failed/);
  });

  test('a provider without hooks is untouched', async () => {
    const log: string[] = [];
    class Plain {
      constructor() {
        log.push('ctor');
      }
    }
    const registry = new ProviderRegistry([Plain]);
    await registry.onModuleInit();
    await registry.shutdown();
    assert.deepEqual(log, ['ctor']);
  });

  test('onApplicationBootstrap runs in construction order, after init', async () => {
    const log: string[] = [];
    class Dep implements OnModuleInit, OnApplicationBootstrap {
      onModuleInit(): void {
        log.push('init:dep');
      }
      onApplicationBootstrap(): void {
        log.push('bootstrap:dep');
      }
    }
    class User implements OnModuleInit, OnApplicationBootstrap {
      constructor(@Inject(Dep) readonly dep: Dep) {}
      onModuleInit(): void {
        log.push('init:user');
      }
      onApplicationBootstrap(): void {
        log.push('bootstrap:user');
      }
    }
    const registry = new ProviderRegistry([User, Dep]);
    await registry.onModuleInit();
    await registry.onApplicationBootstrap();
    assert.deepEqual(log, ['init:dep', 'init:user', 'bootstrap:dep', 'bootstrap:user']);
  });

  test('onApplicationBootstrap aggregates failures without stranding the rest', async () => {
    const log: string[] = [];
    class Boom {
      onApplicationBootstrap(): void {
        throw new Error('nope');
      }
    }
    class Fine {
      onApplicationBootstrap(): void {
        log.push('fine ran');
      }
    }
    const registry = new ProviderRegistry([Boom, Fine]);
    await expect(registry.onApplicationBootstrap()).rejects.toThrow(
      'onApplicationBootstrap failed on Boom: nope',
    );
    assert.deepEqual(log, ['fine ran']);
  });
});
