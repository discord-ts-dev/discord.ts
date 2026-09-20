# ADR 0011 — Bundle the Redis adapter for the Store port

Date: 2026-09-18

Status: accepted. Amends ADR 0004's "apps plug adapters" stance for Redis.

## Context

ADR 0004 rejected bundling Redis or any ORM: the port stays thin and apps plug
adapters. ADR 0009 allows one bundled reference adapter for a port that ships
no production adapter, and #48 uses that slot for the single-process
`FileStore`.

ADR 0010 then gave the port an atomic `update()` that real adapters must
implement. Multi-process and sharded bots keep balances, quests and boards in
Redis, and today every such bot hand-rolls WATCH/MULTI retries. Bun ships a
native Redis client with sorted sets, `KEEPTTL` and transactions, so a Redis
adapter is a bounded, zero-dependency artifact that matches the port
method-for-method.

## Decision

- The framework ships `@discord.ts/redis`: `RedisStore` implements the full
  `Store` port on Bun's native client, including `update()` through
  WATCH/MULTI/EXEC retries and TTL-preserving writes (`SET … KEEPTTL`).
- `incrBy` is integer, truncate toward zero (Redis `INCRBY` semantics) in
  every adapter; the shared conformance suite pins it.
- Sorted-set ties order by member, like Redis; `MemoryStore` adopts the same
  order so `top()` and `rankOf()` agree across adapters.
- The package exposes provider helpers: `redisProviders()` registers the
  store under `STORE` and the raw client under `REDIS`, so apps adopt it
  through the provider registry with no core changes.
- The port's contract gains one explicit rule: a key holds either a string or
  a sorted set, never both. Redis enforces it; `MemoryStore` keeps separate
  namespaces and systems never mix.
- `FileStore` (#48) remains the bundled single-process reference adapter;
  Redis is the bundled production adapter. Prisma and Drizzle stay recipes:
  they have no port to satisfy and no second consumer.

## Consequences

- Multi-process bots get shared system state out of the box; single-process
  bots stay on `MemoryStore`/`FileStore`.
- `tests/store-conformance.ts` becomes the gate for every adapter, including
  future ones; #48 wires `FileStore` into it.
- Core stays clean: no DI container, no lifecycle hooks. Connect and close
  stay explicit, and `close()` belongs to the store.
- Redis keys are the systems data contract, so app tooling can inspect
  `bal:`/`lb:` keys directly.

## Rejected

- ioredis/node-redis: an extra dependency where Bun has a native client. The
  adapter stays open to caller-owned clients through `RedisClientLike`.
- Bundling Prisma/Drizzle packages: no port, no second consumer (ADR 0009's
  rule of two); documented as recipes instead.
- Adding `useFactory`/lifecycle to the provider registry: not needed to ship a
  correct adapter; explicit `close()` is enough.
