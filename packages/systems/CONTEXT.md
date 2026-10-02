# CONTEXT.md — systems

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Store**: the async key/value plus sorted-set port every system reads
  and writes through. `update()` is the atomic read-modify-write; `incrBy`
  and `zincrBy` are single-key atomic increments. A key holds one type,
  string or sorted set, never both. Tolerates **any** key and **any** member:
  a name colliding with a property of `Object.prototype` is an ordinary one,
  never a reason to reject a write (ADR 0016). Whether a name is *meaningful*
  is a system's call, made where the rules are known. Implemented by
  `MemoryStore`, the single-process file reference adapter `FileStore`, and
  the Redis adapter `RedisStore` in `@discord-ts-dev/redis`; further adapters
  are plugged.
- **Store conformance suite**: the shared test surface that pins the port
  contract across adapters: lazy TTL, integer `incrBy`, sorted-set ordering
  (equal scores order by member), atomic `update`, and tolerance of
  adversarial names as a key, a member, and through `update`'s `current` map.
  **Every adapter runs it** — a guarantee enforced on two of three is not a
  port guarantee — so a new adapter inherits the contract rather than
  restating it. Test-only, in `tests/store-conformance.ts`.
- **Store keys**: `bal:` balance, `inv:` inventory, `daily:` index and
  streak, `quest:` state, `lb:` leaderboards, `guild:` settings, `vote:`
  stamps. Apps may address these keys; the value shapes belong to the
  system that owns them.
- **Task**: a named unit of scheduled work. Declared with `defineTask()`,
  run at boot plus on interval or daily time. Owned by `TaskRunner`.
- **Daily**: a once-per-reset-window currency claim. Claimed via
  `claimDaily()`, resets at `dailyAt` in a fixed time zone.
- **Streak**: consecutive daily claims. Broken after `streakGraceDays`
  missed windows, then restarts at one.
- **Leaderboard**: a ranked score board. Written via `addScore()`, read
  via `top()` and `rankOf()`.
- **Quest**: a daily goal from a pool with progress. Assigned via
  `assignQuest()`, advanced via `addProgress()`, swapped once per window
  via `rerollQuest()`, cashed out via `completeQuest()`.
- **Shop**: balance plus inventory. Bought via `buy()`, consumed via
  `useItem()`, topped up via `addBalance()`. An item id is the one
  caller-chosen name in a systems value shape, because a component button
  carries it, so the "any key, any member" rule applies to it as much as to a
  Store key.
- **Guild settings**: per-guild per-command enable flags.
  Read via `getSettings()`, toggled via `setCommandEnabled()`.
  Enforced by `EnabledGuard`.
- **EnabledGuard**: Store-backed guard, `new EnabledGuard(store, { deny? })`.
  DMs and undecorated handlers pass; subcommands toggle by group name.
- **Vote reward**: currency awarded for a bot-list vote webhook. Awarded via
  `awardVote()`; the payload parse is a pure helper in `utils`.
- **Help commands**: the display shape `{ name, description, category? }` that `buildHelp()` groups into **help sections** (sorted, `General` last). Distinct from core's _Help entry_: a registry digest before locale resolution; Help commands are rendered, single-locale text.
- **Registry help feed**: core-shaped entries (`name`, `description`, `category?`, `descriptionLocalizations?`, `toggleable`) consumed structurally — systems never imports core. `buildHelpFromRegistry()` resolves one locale's descriptions into Help commands; `toggleableNames()` lists the toggleable ones.
