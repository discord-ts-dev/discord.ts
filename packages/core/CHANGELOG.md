# @discord-ts-dev/core

## 1.3.0

### Minor Changes

- d47f946: Read `imports` for providers, and add lifecycle hooks.

  `@Module()` accepted `imports` and ignored them — `resolveDiscordOptions` read
  `meta.providers` off the root class and used `imports` only to find the
  `DiscordModule` def. A module listed in `imports` therefore contributed nothing.
  The failure was invisible to the toolchain: with a nested provider removed, `tsc`,
  the build and every other test stayed green and the app died at login with
  `missing provider for token X`.

  - `imports` is now walked depth-first and each module's `providers` are collected
    after the ones it imports, so a consumer is constructed after what it injects.
    A module is visited once, which makes diamonds and cycles terminate.
    `forRoot` defs, `null` and non-classes are skipped.
  - Lifecycle hooks, duck-typed with no decorator and no base class: `onModuleInit`
    after construction in construction order; `onModuleDestroy` then
    `onApplicationShutdown` on SIGINT/SIGTERM in reverse construction order, with
    the client still connected. `bootstrapApp` and `deployWithModule` both run the
    shutdown half.
  - A hook that throws does not skip the others. Failures are reported together,
    and a failing shutdown hook is logged before the client is still stopped, so a
    provider bug cannot strand a websocket open.
  - `ProviderRegistry.onModuleInit()`, `.shutdown()` and `.initialized` are public;
    `collectModuleProviders()` is exported.

  Non-breaking: a module with no `imports` collects exactly what it declared, and
  no provider has hooks until one is added. There is still no `exports`,
  `useFactory` or `useClass` — the registry is deliberately one flat set of single
  instances, and there is no second consumer for encapsulation.

  See docs/adr/0015-import-graph-and-lifecycle-hooks.md.

- d47f946: Add `onApplicationBootstrap` lifecycle hook.

  Runs in `createRuntime` after discovery has scanned and routing has subscribed,
  in construction order, so a provider may assume the bot shape exists. Duck-typed
  like the existing hooks — no decorator, no base class — and failures aggregate
  rather than stranding the rest. Runs in both boot and `deployWithModule` paths,
  so hooks must be deploy-safe.

### Patch Changes

- Updated dependencies [d47f946]
- Updated dependencies [d47f946]
  - @discord-ts-dev/common@1.3.0

## 1.2.2

### Patch Changes

- cff16f3: Remove the two Bun-only globals from `core`, so the package runs on Node as well
  as Bun. `loadDiscordConfig` called `Bun.pathToFileURL` and command discovery
  called `Bun.color`, so any consumer booting under Node got
  `ReferenceError: Bun is not defined`. Replaced with `node:url`'s `pathToFileURL`
  and `node:util`'s `styleText`.

  Importing the package still worked, which is why nothing caught it: the
  `Bun.*` calls only fire when a config is loaded and commands are discovered.
  `packages/core/tests/node-esm.test.ts` now spawns a real `node` and exercises
  both paths.

  `@discord-ts-dev/redis` is unchanged and remains Bun-only by design — it wraps
  `Bun.RedisClient`.

  See docs/adr/0014-signale-cjs-named-import.md.

## 1.2.1

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
  - @discord-ts-dev/i18n@0.3.2
  - @discord-ts-dev/utils@0.4.1
  - @discord-ts-dev/ux@1.2.1

## 1.2.0

### Minor Changes

- d7f67e4: Deepen Discovery with `CommandDefinition`: decorator metadata becomes one
  definition per top-level command (flags, options DTO, localizations, and a
  plain handler or subcommand tree). `DiscordDiscoveryService.slash` becomes
  `commands`; JSON rendering, boot Validation, dispatch matching, and argument
  building consume definitions instead of re-reading Reflect metadata.
  Structural conflicts (duplicate leaves, flag drift, plain/sub mixing) are
  recorded by the builder and aggregated by `validateDiscoveryState()` as before,
  so the one-error-before-REST behavior is unchanged. `optionsDto` is removed
  from `discord-args`.
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

### Patch Changes

- d7f67e4: Deepen the reply module. `replyEphemeral()` and the new `replyEmbed()` now share
  one delivery path, `deliver()`: it replies when the interaction is free, edits
  when it is already acknowledged, and follows up when a private reply is wanted
  after acknowledgement. An acknowledged Context no longer silently drops the
  message, so `confirm()` followed by a result reply works instead of throwing.
  `confirm()`, `paginate()`, and `pickOne()` send through the same path and use
  the current `withResponse` API; the example, music-bot, and owo apps adopt it.
- 30313b2: Configured guard instances plus `EnabledGuard`. Core `resolveGuard` accepts an already-configured `{ canActivate }` instance and uses it as-is, so constructor arguments survive (`authorLock(...)` builds on this). Systems gains `new EnabledGuard(store, { deny? })` next to `isCommandEnabled`: DMs and un-decorated handlers pass, subcommands toggle by group name, default deny is hardcoded English, apps override with i18n. owo adopts it in `PlayerGuarded`; `enabled.guard.ts` keeps `TOGGLEABLE` only.
- Updated dependencies [5f5be1c]
- Updated dependencies [d7f67e4]
- Updated dependencies [d7f67e4]
- Updated dependencies [1bc0112]
- Updated dependencies [1f11e97]
  - @discord-ts-dev/ux@1.2.0
  - @discord-ts-dev/common@1.2.0
  - @discord-ts-dev/utils@0.4.0
  - @discord-ts-dev/i18n@0.3.1

## 1.1.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

### Patch Changes

- 39094f4: Add `replyEphemeral()`: best-effort ephemeral replies that skip when the
  interaction was already answered and never throw. Core guards and the routing
  error path now share it instead of carrying six copies of the same reply block.
- Updated dependencies [39094f4]
- Updated dependencies [6dc5e6c]
  - @discord-ts-dev/ux@1.1.0
  - @discord-ts-dev/common@1.1.0
  - @discord-ts-dev/i18n@0.3.0
  - @discord-ts-dev/utils@0.3.0

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord-ts-dev/common`; update example imports accordingly

### Minor Changes

- d23bb48: Add `CommandContext`: one wrapper over the slash and prefix surfaces. `@Context()` injects it when the param type is `CommandContext`; the raw `ChatInputCommandInteraction | Message` union still injects untouched. One `reply` routes to followUp when the interaction was already answered; `ephemeral` is dropped on prefix instead of failing. `confirm()`, `paginate()`, and `pickOne()` accept the wrapper.
- d23bb48: Add native @Guild() and @Author() param decorators: guild resolves to the interaction/message guild (null in DMs), author to message.author or interaction.user, on slash, prefix, component, modal, and event surfaces
- f52c392: Resolve moderation framework gaps: new utils package (mention/id parsing, snowflake check, message guard), prefix DTO mention coerce plus trailing-text join, RequireBotPermissions guard, Message-capable confirm/paginate, errorEmbed
- d23bb48: Add native i18n in the dedicated `@discord-ts-dev/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`
- d23bb48: Add RequireOwner (owners config), RequireVoice/SameVoice guards, pickOne select picker, and formatTime/progressBar utils
- d23bb48: Add built-in RequireGuild guard: blocks DM use with an ephemeral reply, works on methods and classes, composes with Cooldown and permission guards
- b3d03b2: Store SlashCommand under the unified command key. Discovery runs one branch; `@Command({ slash: true })` + `@Subcommand()` now nests on slash like it already did on prefix. Raw `SLASH_COMMAND_METADATA` still discovers (fallback, removed next major).
- 67f87b6: Add unified Command decorator, group JSON, option extras, and boot validator

### Patch Changes

- e85b103: Run on Bun instead of Node.js. The CLI spawns the runtime it is already running under (`process.execPath`) rather than `node` for build output, uses `Bun.spawnSync` / `Bun.file` / `Bun.stdout`, and its shebang is `#!/usr/bin/env bun` - the `discord` bin needs Bun now. Core reads config files via `Bun.pathToFileURL` and paints route logs with `Bun.color`. Node APIs with no Bun equivalent stay: `node:path`, `node:fs` `realpathSync`/`existsSync`, `node:vm` in the music-bot eval command, and `node:assert` in tests.
- 58bdc90: Fix two validation bugs found by the coverage pass: `validateDto` now calls `class-validator` with `forbidUnknownValues: false`, so plain DTOs without validator decorators pass instead of being blocked with "an unknown value was passed"; `resolveDiscordOptions` no longer clobbers `forRootAsync({ skipValidation: true })` with `undefined`. `deployWithModule()` and `bootstrapApp()` take an optional runtime factory for tests. The CLI runner sets `process.exitCode` instead of calling `process.exit`, so output flushes before the process ends.
- 2ddd05a: Replace chalk with node:util styleText for discovery log colors
- e4cafd1: Add fast-check property tests for the boot validator
- 0a10955: Internal only: the cooldown eviction test drives its 5001 guard checks through `Promise.all` so lint stays warning-free. No API or behaviour change.
- 76feef4: Add bun smoke tests with per-package test scripts
- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
- Updated dependencies [d23bb48]
- Updated dependencies [d23bb48]
- Updated dependencies [f52c392]
- Updated dependencies [d23bb48]
- Updated dependencies [d23bb48]
- Updated dependencies [b3d03b2]
- Updated dependencies [e95d73e]
- Updated dependencies [76feef4]
- Updated dependencies [9f0dea9]
- Updated dependencies [67f87b6]
- Updated dependencies [e6ea827]
  - @discord-ts-dev/common@1.0.0
  - @discord-ts-dev/utils@0.2.0
  - @discord-ts-dev/i18n@0.2.0
