import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import {
  GUARDS_METADATA,
  INJECT_METADATA,
  Inject,
  Injectable,
  Logger,
  MODULE_METADATA,
  Module,
  PIPES_METADATA,
  Reflector,
  SetMetadata,
  UseGuards,
  UsePipes,
  applyDecorators,
} from '../src/index.js';

type Loose = (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => unknown;

/** Decorators are typed for the language service; tests call them directly. */
const loose = (dec: unknown): Loose => dec as unknown as Loose;

describe('Injectable and Module', () => {
  test('Injectable stamps the class', () => {
    class Service {}
    Injectable()(Service);
    assert.equal(Reflect.getMetadata('discord:injectable', Service), true);
  });

  test('Module stores imports and providers', () => {
    class Provider {}
    class App {}
    const meta = { imports: [Provider], providers: [Provider] };
    Module(meta)(App);
    assert.deepEqual(Reflect.getMetadata(MODULE_METADATA, App), meta);
  });

  test('Inject records the token for a constructor parameter', () => {
    class Service {}
    Inject('token')(Service, undefined, 0);
    Inject('second')(Service, undefined, 1);
    assert.deepEqual(Reflect.getMetadata(INJECT_METADATA, Service), {
      0: 'token',
      1: 'second',
    });
  });
});

describe('SetMetadata', () => {
  test('method with descriptor returns it', () => {
    class Probe {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      Probe.prototype,
      'run',
    ) as PropertyDescriptor;
    const out = loose(SetMetadata('k', 1))(Probe.prototype, 'run', descriptor);
    assert.equal(out, descriptor);
    assert.equal(Reflect.getMetadata('k', Probe.prototype.run), 1);
  });

  test('method key without descriptor resolves the function', () => {
    class Probe {
      run(): void {}
    }
    loose(SetMetadata('k', 2))(Probe.prototype, 'run');
    assert.equal(Reflect.getMetadata('k', Probe.prototype.run), 2);
  });

  test('method key that is not a function is ignored', () => {
    class Probe {
      value = 3;
    }
    loose(SetMetadata('k', 4))(Probe.prototype, 'value');
    assert.equal(Reflect.getMetadata('k', Probe.prototype), undefined);
  });

  test('class target stamps the constructor', () => {
    class Probe {}
    loose(SetMetadata('k', 5))(Probe);
    assert.equal(Reflect.getMetadata('k', Probe), 5);
  });
});

describe('applyDecorators', () => {
  test('threads a replaced descriptor through the chain', () => {
    const order: string[] = [];
    const first: Loose = (_t, _k, d) => {
      order.push('first');
      return { ...d, value: () => 'first' } as PropertyDescriptor;
    };
    const second: Loose = (_t, _k, d) => {
      order.push('second');
      return { ...d, value: () => 'second' } as PropertyDescriptor;
    };
    class Probe {
      run(): string {
        return 'none';
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      Probe.prototype,
      'run',
    ) as PropertyDescriptor;
    const chained = loose(applyDecorators(first as never, second as never));
    const out = chained(Probe.prototype, 'run', descriptor) as PropertyDescriptor;
    assert.deepEqual(order, ['first', 'second']);
    assert.equal((out.value as () => string)(), 'second');
  });

  test('class target returns the target when no descriptor exists', () => {
    class Probe {}
    const out = loose(applyDecorators())(Probe);
    assert.equal(out, Probe);
  });
});

describe('UseGuards and UsePipes', () => {
  test('append to a class target', () => {
    class Probe {}
    loose(UseGuards('g1'))(Probe);
    loose(UseGuards('g2'))(Probe);
    loose(UsePipes('p1'))(Probe);
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, Probe), ['g1', 'g2']);
    assert.deepEqual(Reflect.getMetadata(PIPES_METADATA, Probe), ['p1']);
  });

  test('append to a method descriptor', () => {
    class Probe {
      run(): void {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      Probe.prototype,
      'run',
    ) as PropertyDescriptor;
    loose(UseGuards('g'))(Probe.prototype, 'run', descriptor);
    loose(UseGuards('h'))(Probe.prototype, 'run', descriptor);
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, Probe.prototype.run), ['g', 'h']);
  });

  test('append to a method key without descriptor', () => {
    class Probe {
      run(): void {}
    }
    loose(UseGuards('g'))(Probe.prototype, 'run');
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, Probe.prototype.run), ['g']);
  });
});

describe('Reflector', () => {
  test('get reads a key', () => {
    class Probe {}
    Reflect.defineMetadata('k', 'v', Probe);
    assert.equal(new Reflector().get('k', Probe), 'v');
    assert.equal(new Reflector().get('missing', Probe), undefined);
  });

  test('getAllAndOverride takes the first defined target', () => {
    const first = {};
    const second = {};
    Reflect.defineMetadata('k', 'second', second);
    assert.equal(new Reflector().getAllAndOverride('k', [first, second]), 'second');
    Reflect.deleteMetadata('k', second);
    assert.equal(new Reflector().getAllAndOverride('k', [undefined as never, second]), undefined);
  });
});

describe('Logger', () => {
  test('log, warn and error write with the context, App by default', () => {
    const written: string[] = [];
    const origOut = process.stdout.write.bind(process.stdout);
    const origErr = console.error;
    const origWarn = console.warn;
    process.stdout.write = ((chunk: string) => {
      written.push(chunk);
      return true;
    }) as never;
    console.error = (...args: unknown[]) => void written.push(args.join(' '));
    console.warn = (...args: unknown[]) => void written.push(args.join(' '));
    try {
      new Logger('Bot').log('hello', 'world');
      new Logger().warn('careful', 1);
      new Logger().error('boom');
    } finally {
      process.stdout.write = origOut;
      console.error = origErr;
      console.warn = origWarn;
    }
    assert.deepEqual(written, ['[Bot] hello world\n', '[App] careful 1', '[App] boom']);
  });

  test('debug only writes when DISCORD_DEBUG is true', () => {
    const written: string[] = [];
    const origOut = process.stdout.write.bind(process.stdout);
    const orig = process.env.DISCORD_DEBUG;
    process.stdout.write = ((chunk: string) => {
      written.push(chunk);
      return true;
    }) as never;
    try {
      new Logger().debug('quiet');
      process.env.DISCORD_DEBUG = 'true';
      new Logger('Bot').debug('loud', 'ignored');
    } finally {
      process.stdout.write = origOut;
      if (orig === undefined) delete process.env.DISCORD_DEBUG;
      else process.env.DISCORD_DEBUG = orig;
    }
    assert.deepEqual(written, ['[Bot] loud\n']);
  });
});
