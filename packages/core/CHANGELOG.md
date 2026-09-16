# @discord.ts/core

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
