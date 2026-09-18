# ADR 0010 — Store carries atomicity as an operation

Date: 2026-09-18

Status: accepted. Amends ADR 0004's port contract.

## Context

ADR 0004 shipped a thin `Store` port whose only atomic operation was
`incrBy` (its wording: "atomic increment, TTL, sorted-set add/range"). Every
compound flow — `buy` (balance plus inventory), `claimDaily` (claim index,
streak, balance), `addScore` (read then add), guild toggles — read a key and
wrote it back in separate awaits. The comment "atomicity is the adapter's
job" described a contract the port could not express, and admits no
implementation: two overlapping `buy()` calls can both pass the balance check
even in a single process. `MemoryStore.incrBy` also dropped the key's TTL,
which the systems could not see.

ADR 0004's own exception path (queue #48, `FileStore`) and the Paw app's
wealth mirror made the drift visible: a balance write and its board mirror
were two operations, so the board could diverge from the wallet.

## Decision

- The port gains one compound operation: `update(keys, fn)`. `fn` receives
  the current values and returns `{ result, writes?, zadds? }`; null writes
  delete. Adapters apply the result atomically and serialize updates that
  share keys. `fn` must be synchronous; MemoryStore and the JSON `FileStore`
  get atomicity from that, Redis from `WATCH`/`MULTI` retries, Postgres from
  a transaction.
- `incrBy` and a new `zincrBy` stay as named single-key atomic increments.
- Written keys keep their TTL, so rate-limit-style keys survive increments.
- `addBalance`, `buy`, and `claimDaily` accept `{ mirrorBoard }`: exactly one
  sorted-set board is kept equal to the new balance inside the same update.
  This is the mechanism the wealth-mirror consumer needed; it is not a
  general cross-key transaction.
- Systems address keys through one internal `keys` module, and the scheme is
  documented in `systems/CONTEXT.md` as a data contract apps may read.

## Consequences

- Compound systems stop re-deriving read-modify-write; correctness is one
  contract with one test surface per adapter.
- Real adapters must implement `update`; a read-modify-write adapter is no
  longer sufficient. Queue #48 (`FileStore`) must satisfy it.
- The port grows by two methods. ADR 0004's "thin" intent (no ORM, no
  schema, opt-in) is unchanged; this deepens the existing seam rather than
  adding a new one.

## Rejected

- Per-user account documents (one key holding balance, inventory, daily
  state): fewer operations, but it rewrites existing app data and centralises
  unrelated systems. Apps may still choose it.
- Leaving atomicity to adapter comments: it is not expressible, so no adapter
  can satisfy it.
