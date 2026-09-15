# @discord.ts/ux

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
