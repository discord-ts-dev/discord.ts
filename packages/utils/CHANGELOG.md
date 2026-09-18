# @discord.ts/utils

## 0.3.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

## 0.2.0

### Minor Changes

- f52c392: Resolve moderation framework gaps: new utils package (mention/id parsing, snowflake check, message guard), prefix DTO mention coerce plus trailing-text join, RequireBotPermissions guard, Message-capable confirm/paginate, errorEmbed
- d23bb48: Add RequireOwner (owners config), RequireVoice/SameVoice guards, pickOne select picker, and formatTime/progressBar utils
- e6ea827: Move pure helpers to `@discord.ts/utils`: `parseAmount()`, `containsBlocked()` / `maskBlocked()`, and `parseVotePayload()`. They need no `Store`, so `systems` is left with the Store-backed halves - `awardVote()` stays there.

### Patch Changes

- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
