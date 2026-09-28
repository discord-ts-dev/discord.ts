---
'@discord-ts-dev/cli': patch
---

Make the command runner work on Node, not just Bun. `discord dev` and
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
