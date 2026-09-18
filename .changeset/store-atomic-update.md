---
'@discord.ts/systems': minor
---

Carry atomicity as an operation (ADR 0010). `Store` gains
`update(keys, fn)` — one atomic read-modify-write over current values, with
TTL-preserving writes and sorted-set writes applied together — plus
`zincrBy` for atomic score increments. Shop, Daily, Quest, Leaderboard, and
Guild settings express their updates through it, so compound flows no longer
interleave. `addBalance`, `buy`, and `claimDaily` accept `{ mirrorBoard }` to
keep one board equal to the new balance in the same update. Keys move behind
one internal module and the scheme is documented as a data contract.
`MemoryStore` and `incrBy` now preserve TTLs.
