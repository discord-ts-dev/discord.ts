# @discord-ts-dev/systems

## 0.4.2

### Patch Changes

- 4056165: Hold any Store key or member, including names that collide with a property of
  `Object.prototype`.

  `FileStore` resolved `__proto__`, `constructor`, and `prototype` against
  `Object.prototype` instead of treating them as stored names. A sorted-set
  member of that name scored as an object rather than a number, `get` on an
  unwritten `constructor` key returned the inherited constructor instead of
  `null`, `incrBy` over such a key started from zero rather than the stored
  value, and any of the three was dropped on flush because a re-parented write
  is never an own property — so a shop purchase could report success and store
  nothing. `shop`'s inventory map had the same shape on a caller-chosen item id.

  No production input reached these, so this is a latent-defect fix rather than a
  live vulnerability. The port now promises to tolerate any key and any member
  (ADR 0016), the shared conformance suite pins it across all three adapters, and
  `FileStore` holds such names in prototype-free maps. `inventory()` still
  returns an ordinary object, so app code is unaffected.

## 0.4.1

### Patch Changes

- 96e1908: First publish to npm. Add `repository`, `bugs` and `homepage` metadata, and ship
  `CHANGELOG.md` and `LICENSE` in the tarball. See ADR 0012.

  Internal dependencies move from the `workspace:*` protocol to a caret range.
  npm does not rewrite `workspace:` on pack or publish, so the protocol reached
  the registry verbatim and every consumer install failed with
  `EUNSUPPORTEDPROTOCOL`. Caret ranges are what `updateInternalDependencies`
  already expects, and they resolve once the dependencies are published.

- Updated dependencies [96e1908]
  - @discord-ts-dev/common@1.2.1
  - @discord-ts-dev/ux@1.2.1

## 0.4.0

### Minor Changes

- 30313b2: Configured guard instances plus `EnabledGuard`. Core `resolveGuard` accepts an already-configured `{ canActivate }` instance and uses it as-is, so constructor arguments survive (`authorLock(...)` builds on this). Systems gains `new EnabledGuard(store, { deny? })` next to `isCommandEnabled`: DMs and un-decorated handlers pass, subcommands toggle by group name, default deny is hardcoded English, apps override with i18n. owo adopts it in `PlayerGuarded`; `enabled.guard.ts` keeps `TOGGLEABLE` only.
- 033afd4: Bundle the `FileStore` reference adapter (ADR 0004 amendment via ADR 0009
  port exception). `new FileStore(file)` keeps state in memory with lazy TTL
  and syncs the whole JSON file (`file.tmp` + rename) per write — single
  process only, no options object. Pin integer `incrBy` (truncate toward zero,
  Redis `INCRBY`); `MemoryStore` is patched to match. owo adopts the framework
  adapter with the same `OWO_DATA_FILE` default.
- d7f67e4: Add real constructor injection. `@Inject(token)` records the token a
  constructor parameter resolves from, and `createRuntime` builds providers —
  classes and `{ provide, useValue }` values — through a `ProviderRegistry` that
  constructs each provider once, resolves dependencies in declaration order, and
  fails on duplicates, missing tokens, and cycles. Guards named in
  `@UseGuards()` resolve through the same registry, so app guards inject
  providers instead of defaulting to module singletons. `@discord-ts-dev/systems`
  exports the `STORE` token for apps plugging their Store adapter (ADR 0004).
  Modules stay flat: only the root module's providers are read.
- 1bc0112: Registry-driven help and toggleable commands. `@Command()` and group metadata carry `category` and
  `toggleable` (top level only; sub-level values warn at boot). `DiscordDiscoveryService.helpEntries()`
  returns one `HelpEntry` per top-level command — a group counts once, by group name — with
  descriptions merged from the i18n catalog; the service is injectable via the new `DISCORD_DISCOVERY`
  token. Systems adds `buildHelpFromRegistry()` (locale-resolved sections) and `toggleableNames()`.
  Validation now errors on an `@Options()` DTO erased by `import type` (`DTO resolved to Object`).
  Paw deletes its `HELP` and `TOGGLEABLE` lists — `/enable` and `/disable` pick from the registry via
  autocomplete — and music-bot deletes its `COMMANDS` list.
- d7f67e4: Carry atomicity as an operation (ADR 0010). `Store` gains
  `update(keys, fn)` — one atomic read-modify-write over current values, with
  TTL-preserving writes and sorted-set writes applied together — plus
  `zincrBy` for atomic score increments. Shop, Daily, Quest, Leaderboard, and
  Guild settings express their updates through it, so compound flows no longer
  interleave. `addBalance`, `buy`, and `claimDaily` accept `{ mirrorBoard }` to
  keep one board equal to the new balance in the same update. Keys move behind
  one internal module and the scheme is documented as a data contract.
  `MemoryStore` and `incrBy` now preserve TTLs.

### Patch Changes

- 8850420: Pin `incrBy` to integer semantics: increments truncate toward zero (Redis
  `INCRBY` behavior) instead of storing fractional sums. Sorted-set ties now
  order by member like Redis, and the port is pinned by a shared conformance
  suite.
- Updated dependencies [5f5be1c]
- Updated dependencies [d7f67e4]
- Updated dependencies [d7f67e4]
- Updated dependencies [1bc0112]
  - @discord-ts-dev/ux@1.2.0
  - @discord-ts-dev/common@1.2.0

## 0.3.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

## 0.2.0

### Minor Changes

- 08475ce: New systems package (zero deps): Store port plus MemoryStore, TaskRunner scheduler, daily streaks, quests with reroll, leaderboards, shop and inventory, guild settings, word filter, vote rewards, help builder, prefix sub-routes, amount parser
- e6ea827: Move pure helpers to `@discord-ts-dev/utils`: `parseAmount()`, `containsBlocked()` / `maskBlocked()`, and `parseVotePayload()`. They need no `Store`, so `systems` is left with the Store-backed halves - `awardVote()` stays there.

### Patch Changes

- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
