import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { Inject } from '@discord.ts/common';
import { ProviderRegistry } from '../src/provider-registry.js';

describe('ProviderRegistry', () => {
  test('constructs classes once and injects them by token', () => {
    let count = 0;
    class Service {
      constructor() {
        count += 1;
      }
    }
    class Consumer {
      constructor(@Inject(Service) readonly service: Service) {}
    }
    const registry = new ProviderRegistry([Consumer, Service]);
    const consumer = registry.resolve(Consumer);
    assert.equal(count, 1);
    assert.equal(consumer.service, registry.resolve(Service));
    assert.deepEqual(registry.list(), [registry.resolve(Service), consumer]);
  });

  test('value providers hand out the value as-is and stay out of the scan list', () => {
    const value = { adapter: true };
    const registry = new ProviderRegistry([{ provide: 'TOKEN', useValue: value }]);
    assert.equal(registry.resolve('TOKEN'), value);
    assert.deepEqual(registry.list(), []);
  });

  test('fails on duplicate providers and unknown tokens', () => {
    class Service {}
    assert.throws(() => new ProviderRegistry([Service, Service]), /duplicate provider: Service/);
    assert.throws(
      () => new ProviderRegistry([{ provide: 'TOKEN', useValue: 1 }]).resolve('other'),
      /missing provider for token other/,
    );
  });

  test('fails on a dependency cycle', () => {
    class Selfish {
      constructor(@Inject(Selfish) readonly self: unknown) {}
    }
    assert.throws(() => new ProviderRegistry([Selfish]), /cyclic provider dependency at Selfish/);
  });

  test('resolveOrCreate constructs, caches and registers unlisted classes', () => {
    class Guard {
      canActivate(): boolean {
        return true;
      }
    }
    const registry = new ProviderRegistry([]);
    const guard = registry.resolveOrCreate(Guard);
    assert.equal(registry.resolveOrCreate(Guard), guard);
    assert.equal(registry.resolve(Guard), guard);
    assert.deepEqual(registry.list(), [guard]);
  });
});
