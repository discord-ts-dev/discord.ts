# @discord.ts/ux

## 1.2.0

### Minor Changes

- d7f67e4: Deepen the reply module. `replyEphemeral()` and the new `replyEmbed()` now share
  one delivery path, `deliver()`: it replies when the interaction is free, edits
  when it is already acknowledged, and follows up when a private reply is wanted
  after acknowledgement. An acknowledged Context no longer silently drops the
  message, so `confirm()` followed by a result reply works instead of throwing.
  `confirm()`, `paginate()`, and `pickOne()` send through the same path and use
  the current `withResponse` API; the example, music-bot, and owo apps adopt it.

## 1.1.0

### Minor Changes

- 39094f4: Add `replyEphemeral()`: best-effort ephemeral replies that skip when the
  interaction was already answered and never throw. Core guards and the routing
  error path now share it instead of carrying six copies of the same reply block.
- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord.ts/common`; update example imports accordingly

### Minor Changes

- d23bb48: Add `CommandContext`: one wrapper over the slash and prefix surfaces. `@Context()` injects it when the param type is `CommandContext`; the raw `ChatInputCommandInteraction | Message` union still injects untouched. One `reply` routes to followUp when the interaction was already answered; `ephemeral` is dropped on prefix instead of failing. `confirm()`, `paginate()`, and `pickOne()` accept the wrapper.
- f52c392: Resolve moderation framework gaps: new utils package (mention/id parsing, snowflake check, message guard), prefix DTO mention coerce plus trailing-text join, RequireBotPermissions guard, Message-capable confirm/paginate, errorEmbed
- d23bb48: Add RequireOwner (owners config), RequireVoice/SameVoice guards, pickOne select picker, and formatTime/progressBar utils

### Patch Changes

- 76feef4: Add bun smoke tests with per-package test scripts
- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
