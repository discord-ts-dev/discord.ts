# 0007 — Tests run against workspace sources, not `dist`

Date: 2026-09-15

## Context

Per-package tests imported `@discord.ts/*` through `node_modules`, which resolved
to each package's built `dist`. Three problems followed: `bun test` inside a
package failed on a clean checkout (no `dist`), coverage reports counted
dependency `dist` files (i18n showed 11% inside core's report), and tests
exercised build output rather than the source they were written for.

`tsconfig` `paths` cannot fix this: mapping `@discord.ts/*` to `src` makes
`tsc` pull foreign sources into a package build and fail with `TS6059` (file
not under `rootDir`). Runtime bundler plugins (`Bun.plugin` `onResolve`) do
not intercept bare specifiers in `bun test`.

## Decision

A single test preload, `scripts/test-preload.ts`, registers `bun:test`
`mock.module` redirects for the six workspace packages to their `src/index.ts`.
It is passed by `--preload` in the root `test` script and in every package
`test` script. The root `test` script runs `bun test` once over
`packages apps`, so the coverage gate is a single combined report and needs no
build. A root `tsconfig.json` typechecks the tests and mirrors the compiler
options bun needs (e.g. `experimentalDecorators`); it deliberately has no
`paths` map - `paths` in the root config makes `bun test` hang on discovery
(reproduced on bun 1.3.14), so test type resolution goes through the packages'
built `.d.ts` like every other consumer. Tests use `bun:test` as the single
runner; `turbo.json`'s `test` task no longer depends on `^build`.

## Consequences

- Coverage counts package sources, never `dist` - the 100% gate is meaningful.
- Adding `@discord.ts/*` to the preload map and the root `tsconfig.json` paths
  is required whenever a new workspace package appears.
- Running the root `test` script is the gate; per-package runs exist for speed
  but the aggregate run is what CI enforces.

## Skipped

- Folding the preload into `tsconfig` `paths` alone (breaks package builds).
- Running tests against `dist` and ignoring dependency rows in coverage
  (bun has no coverage path filter, and the clean-checkout failure remains).
