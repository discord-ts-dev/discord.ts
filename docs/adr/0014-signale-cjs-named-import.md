# ADR 0014 — Load signale through createRequire, not a named ESM import

Date: 2026-09-28

Status: accepted. Found by a consumer on the day of the first publish.

## Context

`packages/common/src/logger.ts` opened with:

```ts
import { Signale } from 'signale';
```

signale is CommonJS. Its entry point ends with:

```js
module.exports = Object.assign(new Signale(), { Signale });
```

`Object.assign` onto a fresh instance is a computed shape, so Node's
`cjs-module-lexer` cannot statically discover a named export from it. Under
Node ESM, every consumer got this at import time:

```
SyntaxError: The requested module 'signale' does not provide an export named 'Signale'
```

`@discord-ts-dev/common` is the root of every other package here, so this broke
`core`, `systems`, `redis`, `ux`, `cli` and all three apps on import. Nothing
worked that imported the framework at all.

Bun resolves the interop and does not throw, which is why 528 tests passed and
CI was green. The failure lives entirely outside the repo, in the artifact, and
only in one of the two runtimes the packages are meant to work under. The same
shape of bug as ADR 0013: a green build is not evidence about the published
package.

## Decision

Resolve signale through `createRequire(import.meta.url)('signale')` and
destructure the constructor from the result. The constructor type is written by
hand against `SignaleOptions<BaseTypes>`, where `BaseTypes` extends
`DefaultMethods` with `'route' | 'ready'` — signale's own `SignaleConstructor`
erases the generic, so it cannot be reused directly.

Bun runs this unchanged. `createRequire` is standard in both runtimes and needs
no conditional.

## Scope: the same bug class, three instances

While verifying the fix on a Node consumer, `core` turned out to use two Bun
globals that fail the same way:

| Location | Bun global | Replaced with |
|---|---|---|
| `common/src/logger.ts` | named import of a CJS `module.exports` | `createRequire` |
| `core/src/config.ts` | `Bun.pathToFileURL` | `node:url`'s `pathToFileURL` |
| `core/src/discovery/discord-discovery.service.ts` | `Bun.color` | `node:util`'s `styleText` |

Both are Bun-only globals with a direct `node:` equivalent, and both sit in the
boot path: the first when a config is loaded, the second when commands are
discovered. So `import('@discord-ts-dev/core')` succeeded under Node and the
process still died moments later at `ReferenceError: Bun is not defined`. A test
that only imports would have passed.

`redis` is deliberately excluded: it wraps `Bun.RedisClient`, a Bun API rather
than a portable one. That package is Bun-only by design.

The rule this yields: a package meant to run on Node must not reference a Bun
global in a reachable path, and "reachable" has to be proven by executing it,
not by reading it.

## Consequences

- The generic on `BaseLogger` becomes `SignaleInstance<BaseTypes>` rather than
  bare `Signale`. Same members, narrower `types` keying.
- `packages/common/tests/node-esm.test.ts` and `packages/core/tests/node-esm.test.ts`
  spawn a real `node`. `core`'s test goes past importing: it writes a throwaway
  `discord.config.ts` and calls `loadDiscordConfig`, because that is the call
  that previously threw. Both skip when `node` is absent.
- Verified failing on the pre-fix code and passing after, in both directions.
- Any future CommonJS dependency with a computed `module.exports`, and any future
  Bun global, needs the same treatment. `bun test` cannot reproduce either; only
  a Node process can.
- Because it reads `dist/`, the suite has to produce `dist/` first. The root
  `test` script runs `bun test` directly over `packages/`, bypassing turbo, so
  it builds the packages itself; turbo's `test` task gained `build` for the
  package-scoped path. A full cold build of the eight packages is under a
  second, so this is cheaper than the alternative of a test that skips itself
  and stops catching the bug.
- Any future CommonJS dependency with a computed `module.exports` needs the same
  treatment. The check that catches it is `import`-ing the built package from
  Node, not a unit test — Bun will not reproduce it.

## Rejected

- `import signale from 'signale'` and destructure: `esModuleInterop` gives the
  whole `module.exports` as the default, so the class is reachable, but the
  declaration file uses `export =`, and the default import reads as an
  unrelated type under this repo's `NodeNext` settings. `createRequire` states
  the CJS boundary explicitly.
- Dropping signale for `node:util.styleText`: `styleText` moves to call sites
  and loses the badge/scope formatting, which is the point of the dependency.
- Replacing signale with a wrapper: same work, and the bug is one line.
