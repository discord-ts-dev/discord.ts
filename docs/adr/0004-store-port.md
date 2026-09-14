# ADR 0004 — Thin opt-in `Store` port for persistence

Date: 2026-09-14

## Context

OwO-style bots are 100% DB-backed (wallet, zoo, inventory, quests,
streaks, leaderboards). The framework has no persistence story: Shiroko
wires Prisma+Postgres app-side, the template adds Redis, and every
capability we want next (daily-reset, streaks, leaderboards, guild
settings) needs somewhere to keep counters.

## Decision

- The framework ships a thin async `Store` port (key get/set, atomic
  increment, TTL, sorted-set add/range for leaderboards) plus an
  in-memory adapter for dev/tests.
- Apps plug a real adapter (Prisma, Redis, Keyv). Capabilities take a
  `Store`, never a concrete DB. The framework gains zero ORM deps.
- Flexibility rule: the port is opt-in. Bots that already own
  persistence (Shiroko) keep it and ignore the port.

## Consequences

- Streak, leaderboard, guild-settings helpers build on `Store` instead
  of each inventing storage. Memory adapter keeps the example bot
  dependency-free.

## Skipped

- Bundling Prisma or any ORM (lock-in, heavy, dictates schema style).
- A schemaless-only JSON blob store (sorted sets are needed for
  `top`/`my` leaderboards; blobs alone cannot rank).
