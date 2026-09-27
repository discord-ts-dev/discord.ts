# ADR 0013 — Caret ranges in publishable packages, `workspace:*` in private ones

Date: 2026-09-27

Status: accepted. Found during the first npm publish, immediately before it.

## Context

Every internal dependency in the repo used the `workspace:*` protocol: 9 ranges
across the publishable packages, plus 28 in the root manifest and the three
private apps. That is the Bun-idiomatic choice, and it is invisible as a bug.
Bun resolves `workspace:*` to the local package, so `bun install`, `bun run
build`, `bun run typecheck` and all 528 tests passed. So did CI on a clean
checkout.

Nothing rewrites the protocol on the way to the registry. `changeset version`
leaves the range untouched, and `npm pack` copies it into the tarball verbatim.
npm only understands `workspace:` inside a workspace, so the registry would have
received `"@discord-ts-dev/common": "workspace:*"` and every consumer install
would have failed with `EUNSUPPORTEDPROTOCOL - Unsupported URL Type "workspace:"`.

The green build was the tell. Nothing in the repo could have caught this, because
the bug lives entirely outside the repo, in the artifact.

## Decision

- The four publishable packages with internal dependencies — `core`, `i18n`,
  `redis`, `systems` — use caret ranges (`"@discord-ts-dev/common": "^1.2.0"`).
  These manifests are what npm sees, so they must be npm-valid.
- The root manifest and the three private apps keep `workspace:*`. They are never
  published, and the protocol is what stops Bun silently resolving to a registry
  copy when a local version drifts below a range.
- `updateInternalDependencies` was already `"patch"`, so Changesets manages these
  ranges. On the first publish it moved them to `^1.2.1`, `^0.3.2` and `^0.4.1`
  in step with the versions it was publishing.

## Consequences

- Two dependency styles coexist, split on whether the manifest is published. The
  split is the point, not an inconsistency to tidy up later.
- The bug is only observable by packing an artifact and installing it. `npm pack
  --dry-run` in a package directory, then reading `package/package.json` out of
  the tarball, is the check that catches it. Unit tests cannot.
- `workspace:*` returns in the private apps the moment a package is added to
  `apps/*`, which is correct. It returns as a defect the moment a manifest joins
  the eight published ones.
- Anyone adding a ninth publishable package must use caret ranges for its
  internal dependencies from the start.

## Rejected

- `workspace:^` and `workspace:~`: still the `workspace:` protocol, still copied
  verbatim by `npm pack`. Same failure, less obvious.
- A `prepack` script that rewrites ranges to concrete versions at pack time:
  keeps the manifests clean, but makes published content depend on a script
  running, and leaves the repo asserting something the registry never sees.
- Caret ranges everywhere, including the private apps: `^1.2.0` resolves to the
  local package only while the local version satisfies it. Bump a package to
  `1.3.0` while a sibling still declares `^1.2.0` and Bun fetches the published
  copy instead of the working tree, so tests run against the registry.
