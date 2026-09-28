# @discord-ts-dev/cli

## 1.0.2

### Patch Changes

- 1aa233b: Make the command runner work on Node, not just Bun. `discord dev` and
  `discord deploy` could not run at all on Node: `cli.ts` used six Bun globals
  (`Bun.fileURLToPath`, `Bun.file`, `Bun.spawnSync`, `Bun.stdout`, `Bun.stderr`,
  `Bun.argv`) and carried a `#!/usr/bin/env bun` shebang. All are replaced with
  `node:` builtins, and the shebang is now `node`.

  One behavioural difference worth naming: `Bun.spawnSync` takes a single argv
  array, `child_process.spawnSync` takes `(file, args, options)`. The array is now
  split, so the spawn works on both runtimes.

  `CliDeps.spawn` is narrowed to return `{ exitCode }` rather than Node's full
  `SpawnSyncReturns`, which is all `main()` reads and which no single value
  satisfies because of its buffer-generic overloads.

  Tests in `packages/cli/tests/cli.test.ts` now spawn a real `node` and exercise
  the usage path, the unknown-command path, and an actual spawn. Verified failing
  before this change and passing after.

  See docs/adr/0014-signale-cjs-named-import.md.

## 1.0.1

### Patch Changes

- 96e1908: First publish to npm. Add `repository`, `bugs` and `homepage` metadata, and ship
  `CHANGELOG.md` and `LICENSE` in the tarball. See ADR 0012.

  Internal dependencies move from the `workspace:*` protocol to a caret range.
  npm does not rewrite `workspace:` on pack or publish, so the protocol reached
  the registry verbatim and every consumer install failed with
  `EUNSUPPORTEDPROTOCOL`. Caret ranges are what `updateInternalDependencies`
  already expects, and they resolve once the dependencies are published.

## 1.0.0

### Major Changes

- e95d73e: Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord-ts-dev/common`; update example imports accordingly

### Minor Changes

- e85b103: Run on Bun instead of Node.js. The CLI spawns the runtime it is already running under (`process.execPath`) rather than `node` for build output, uses `Bun.spawnSync` / `Bun.file` / `Bun.stdout`, and its shebang is `#!/usr/bin/env bun` - the `discord` bin needs Bun now. Core reads config files via `Bun.pathToFileURL` and paints route logs with `Bun.color`. Node APIs with no Bun equivalent stay: `node:path`, `node:fs` `realpathSync`/`existsSync`, `node:vm` in the music-bot eval command, and `node:assert` in tests.
- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.

### Patch Changes

- 58bdc90: Fix two validation bugs found by the coverage pass: `validateDto` now calls `class-validator` with `forbidUnknownValues: false`, so plain DTOs without validator decorators pass instead of being blocked with "an unknown value was passed"; `resolveDiscordOptions` no longer clobbers `forRootAsync({ skipValidation: true })` with `undefined`. `deployWithModule()` and `bootstrapApp()` take an optional runtime factory for tests. The CLI runner sets `process.exitCode` instead of calling `process.exit`, so output flushes before the process ends.
- 76feef4: Add bun smoke tests with per-package test scripts
