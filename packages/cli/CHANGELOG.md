# @discord.ts/cli

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord.ts/common`; update example imports accordingly

### Minor Changes

- e85b103: Run on Bun instead of Node.js. The CLI spawns the runtime it is already running under (`process.execPath`) rather than `node` for build output, uses `Bun.spawnSync` / `Bun.file` / `Bun.stdout`, and its shebang is `#!/usr/bin/env bun` - the `discord` bin needs Bun now. Core reads config files via `Bun.pathToFileURL` and paints route logs with `Bun.color`. Node APIs with no Bun equivalent stay: `node:path`, `node:fs` `realpathSync`/`existsSync`, `node:vm` in the music-bot eval command, and `node:assert` in tests.
- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.

### Patch Changes

- 58bdc90: Fix two validation bugs found by the coverage pass: `validateDto` now calls `class-validator` with `forbidUnknownValues: false`, so plain DTOs without validator decorators pass instead of being blocked with "an unknown value was passed"; `resolveDiscordOptions` no longer clobbers `forRootAsync({ skipValidation: true })` with `undefined`. `deployWithModule()` and `bootstrapApp()` take an optional runtime factory for tests. The CLI runner sets `process.exitCode` instead of calling `process.exit`, so output flushes before the process ends.
- 76feef4: Add bun smoke tests with per-package test scripts
