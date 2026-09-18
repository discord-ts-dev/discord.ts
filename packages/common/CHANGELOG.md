# @discord.ts/common

## 1.1.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord.ts/common`; update example imports accordingly

### Minor Changes

- d23bb48: Add `CommandContext`: one wrapper over the slash and prefix surfaces. `@Context()` injects it when the param type is `CommandContext`; the raw `ChatInputCommandInteraction | Message` union still injects untouched. One `reply` routes to followUp when the interaction was already answered; `ephemeral` is dropped on prefix instead of failing. `confirm()`, `paginate()`, and `pickOne()` accept the wrapper.
- d23bb48: Add native @Guild() and @Author() param decorators: guild resolves to the interaction/message guild (null in DMs), author to message.author or interaction.user, on slash, prefix, component, modal, and event surfaces
- f52c392: Resolve moderation framework gaps: new utils package (mention/id parsing, snowflake check, message guard), prefix DTO mention coerce plus trailing-text join, RequireBotPermissions guard, Message-capable confirm/paginate, errorEmbed
- d23bb48: Add native i18n in the dedicated `@discord.ts/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`
- d23bb48: Add RequireOwner (owners config), RequireVoice/SameVoice guards, pickOne select picker, and formatTime/progressBar utils
- 67f87b6: Add unified Command decorator, group JSON, option extras, and boot validator

### Patch Changes

- b3d03b2: Store SlashCommand under the unified command key. Discovery runs one branch; `@Command({ slash: true })` + `@Subcommand()` now nests on slash like it already did on prefix. Raw `SLASH_COMMAND_METADATA` still discovers (fallback, removed next major).
- 76feef4: Add bun smoke tests with per-package test scripts
- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
