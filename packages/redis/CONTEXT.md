# CONTEXT.md — redis

Ubiquitous language. Glossary only. No implementation.

## Terms

- **RedisStore**: the Redis adapter for the systems `Store` port. Values are
  strings, sorted sets are scores; `update()` runs WATCH/MULTI/EXEC with
  retries so compound systems stay atomic across processes.
- **Redis client**: Bun's native `RedisClient`, or any object satisfying
  `RedisClientLike`. A store closes a client it built; a caller-owned client
  stays open.
- **REDIS token**: `discord:redis`. Resolves to the raw Redis client through
  the provider registry.
- **redisProviders()**: returns the `Provider[]` that registers one
  `RedisStore` under `STORE` and its client under `REDIS`. Apps list it in
  `@Module({ providers })`.
