# State

Answering exactly once, and what outlives the process.

## One reply

An interaction moves through states, and each state allows one kind of answer:

| State | Allowed |
| --- | --- |
| fresh | `reply` — or `deferReply` to buy time |
| deferred | `editReply` |
| replied | `followUp` |

`deliver(target, payload, opts)` from `@discord.ts/ux` picks the right one from the target's state: `editReply` when already acknowledged, `followUp` when a private reply is wanted afterwards, `reply` when still free (`packages/ux/src/reply.ts:61-73`).

**`deliver()` never throws — it returns `null`** (`reply.ts:54-76`; the catch at `:74-76` swallows everything, including failures it does not log). A `null` return is a failed send, not a quiet success. If the send matters, check it.

**`deliver()` does not buy you time.** Its target interface has no `deferReply` at all (`reply.ts:21-27`): a fresh target gets `reply` at `:73`, whenever that happens to be. So a handler that does slow work first and calls `deliver()` at the end has already missed the deadline — the helper looks like it owns the lifecycle and it does not. Call `deferReply()` on the interaction before the slow work; `deliver()` then finds a deferred target and edits it.

Errors go through the single failure style, `errorEmbed()`, and ephemeral. Validation failures and guard denials already reply for themselves.

## Collectors and components

A collector without a timeout is a leak. Always bound one, and pass `allowedUserId` on every dialog that acts on another user or on shared state: **without it, anyone can click anyone's button.** The lock is opt-in, not default — `normalizeCollectorOptions` leaves it undefined unless you pass it (`packages/ux/src/collector-options.ts:14`), and the check is conditional at `confirm.ts:54` and `paginate.ts:57`. A rejected click gets an ephemeral "Not yours" and the collector stays open, so the lock is free.

`confirm` and `paginate` do handle the rest: 15s and 60s default timeouts, generated `customId`s, and clearing the components on resolve. Reach for them before hand-rolling a `createMessageComponentCollector` loop. `pickOne` is a picker; `weightedPick` in `@discord.ts/utils` is a weighted draw — not the same function.

**A declined `confirm` has already answered the interaction.** It edits the message to "Cancelled." with the buttons removed (`confirm.ts:60`), so the handler returns without replying — `if (!ok) return;`. Replying again is a double-reply. A *timeout* resolves `false` silently, leaving live buttons that nothing handles, so a dialog the user needed to act on is worth a `followUp` on the timeout path.

`customId` is the whole routing key for anything you declare yourself with `@Button()` or a select. Encode the target in it (`/warn:confirm:<userId>`) and re-check ownership on the interaction, not only at render time. Length limits are in `references/platform.md`.

## Persistence

State that must survive a restart goes through the Store port. The contract, in full:

- **Keys** go through the Store's internal `keys` module. That module is a documented data contract, not a helper — changing a key shape is a migration.
- **`update(keys, fn)` is the atomic unit.** `fn` is **synchronous** and returns `{ result, writes?, zadds? }`. A `null` write deletes. The adapter applies it atomically and serializes updates that share keys — Memory and JSON by construction, Redis via `WATCH`/`MULTI`, Postgres in a transaction.
- Read-then-write **outside** `update` is a race. Two guilds or two processes will interleave.
- `incrBy` is integer and truncates toward zero. TTL survives writes. A key holds either a string or a sorted set, never both. `{ mirrorBoard }` keeps exactly one sorted-set board equal to a balance inside a single update.
- Cross-adapter rules the tests rely on: sorted-set ties order by member, so `top()` and `rankOf()` agree.

The Redis adapter ships (`@discord.ts/redis`, Bun's native client, `SET … KEEPTTL`). Prisma and Drizzle are documented recipes, not a port — a bot that needs them owns the wiring (ADR-0011).

## Proving it

App tests live in `apps/<app>/tests/*.test.ts` and run through the workspace preload (`bun test apps`), so a test imports workspace packages from source rather than `dist` (ADR-0007). Add a new workspace package to `scripts/test-preload.ts` or its tests will resolve the wrong build. The gate commands are in `references/ops.md`.
