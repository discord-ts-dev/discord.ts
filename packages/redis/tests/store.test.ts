import { RedisStore } from '../src/index.js';
import { storeConformance } from '../../../tests/store-conformance.js';
import { FakeRedisClient } from './helpers/fake-client.js';

storeConformance(
  'RedisStore (fake client)',
  () => new RedisStore({ client: new FakeRedisClient() }),
);
