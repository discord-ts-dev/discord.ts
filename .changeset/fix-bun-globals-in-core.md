---
'@discord-ts-dev/core': patch
---

Remove the two Bun-only globals from `core`, so the package runs on Node as well
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
