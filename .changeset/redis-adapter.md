---
'@discord.ts/redis': minor
---

New `@discord.ts/redis` package: `RedisStore` implements the `Store` port on
Bun's native Redis client — including `update()` through WATCH/MULTI/EXEC
retries, TTL-preserving writes, integer `incrBy`, and sorted sets — plus
`redisProviders()` to register the store under `STORE` and the raw client
under `REDIS` through the provider registry (ADR 0011).
