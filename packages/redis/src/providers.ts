import type { Provider } from '@discord.ts/common';
import { STORE } from '@discord.ts/systems';
import { RedisStore, type RedisStoreOptions } from './store.js';

/** Token apps inject to address the raw Redis client. */
export const REDIS = 'discord:redis';

/**
 * Providers that register one RedisStore as the app's Store plus its raw
 * client under REDIS. Add the result to `@Module({ providers })`; consumers
 * then resolve them with `@Inject(STORE)` and `@Inject(REDIS)`.
 */
export function redisProviders(options?: string | RedisStoreOptions): Provider[] {
  const store = new RedisStore(options);
  return [
    { provide: STORE, useValue: store },
    { provide: REDIS, useValue: store.client },
  ];
}
