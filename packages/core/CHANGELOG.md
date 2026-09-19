# @discord.ts/core

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
  providers instead of defaulting to module singletons. `@discord.ts/systems`
  exports the `STORE` token for apps plugging their Store adapter (ADR 0004).
  Modules stay flat: only the root module's providers are read.

### Patch Changes

- d7f67e4: Deepen the reply module. `replyEphemeral()` and the new `replyEmbed()` now share
  one delivery path, `deliver()`: it replies when the interaction is free, edits
  when it is already acknowledged, and follows up when a private reply is wanted
  after acknowledgement. An acknowledged Context no longer silently drops the
  message, so `confirm()` followed by a result reply works instead of throwing.
  `confirm()`, `paginate()`, and `pickOne()` send through the same path and use
  the current `withResponse` API; the example, music-bot, and owo apps adopt it.
- Updated dependencies [d7f67e4]
- Updated dependencies [d7f67e4]
  - @discord.ts/ux@1.2.0
  - @discord.ts/common@1.2.0
  - @discord.ts/i18n@0.3.1

## 1.1.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

### Patch Changes

- 39094f4: Add `replyEphemeral()`: best-effort ephemeral replies that skip when the
  interaction was already answered and never throw. Core guards and the routing
  error path now share it instead of carrying six copies of the same reply block.
- Updated dependencies [39094f4]
- Updated dependencies [6dc5e6c]
  - @discord.ts/ux@1.1.0
  - @discord.ts/common@1.1.0
  - @discord.ts/i18n@0.3.0
  - @discord.ts/utils@0.3.0

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord.ts/common`; update example imports accordingly

### Minor Changes

- d23bb48: Add `CommandContext`: one wrapper over the slash and prefix surfaces. `@Context()` injects it when the param type is `CommandContext`; the raw `ChatInputCommandInteraction | Message` union still injects untouched. One `reply` routes to followUp when the interaction was already answered; `ephemeral` is dropped on prefix instead of failing. `confirm()`, `paginate()`, and `pickOne()` accept the wrapper.
- d23bb48: Add native @Guild() and @Author() param decorators: guild resolves to the interaction/message guild (null in DMs), author to message.author or interaction.user, on slash, prefix, component, modal, and event surfaces
- f52c392: Resolve moderation framework gaps: new utils package (mention/id parsing, snowflake check, message guard), prefix DTO mention coerce plus trailing-text join, RequireBotPermissions guard, Message-capable confirm/paginate, errorEmbed
- d23bb48: Add native i18n in the dedicated `@discord.ts/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`
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
  - @discord.ts/common@1.0.0
  - @discord.ts/utils@0.2.0
  - @discord.ts/i18n@0.2.0
