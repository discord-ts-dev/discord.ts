# @discord.ts/redis

## 0.2.0

### Minor Changes

- 8850420: New `@discord.ts/redis` package: `RedisStore` implements the `Store` port on
  Bun's native Redis client — including `update()` through WATCH/MULTI/EXEC
  retries, TTL-preserving writes, integer `incrBy`, and sorted sets — plus
  `redisProviders()` to register the store under `STORE` and the raw client
  under `REDIS` through the provider registry (ADR 0011).

### Patch Changes

- Updated dependencies [30313b2]
- Updated dependencies [033afd4]
- Updated dependencies [d7f67e4]
- Updated dependencies [1bc0112]
- Updated dependencies [d7f67e4]
- Updated dependencies [8850420]
  - @discord.ts/systems@0.4.0
  - @discord.ts/common@1.2.0
