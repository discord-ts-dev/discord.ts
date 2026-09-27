# ADR 0012 — Gate publishing, bootstrap the first version by hand

Date: 2026-09-26

Status: accepted. Formalises the gate `release.yml` already carried and records
why the first publish of each package cannot be automated.

## Context

The eight `@discord-ts-dev/*` packages have never been published. `npm view` 404s
for all of them, and `release.yml` gates its publish step on the
`PUBLISH_ENABLED` repository variable — unset, so every run to date has only
opened a Version PR.

The packages were first written as `@discord.ts/*`, matching the project name.
That scope could not be claimed: npm reports the name unavailable, and since
organizations cannot be renamed, an org named `discord.ts` was never going to
exist. The registry will not name the holder — `/-/user/<name>` and
`/-/org/<name>` return `ResourceNotFound` for every name, including accounts
that demonstrably exist, so they cannot be used to probe availability. The
packages were renamed to `@discord-ts-dev/*` before the first publish, which
also matches the GitHub organization. Nothing had shipped under the old scope,
so no consumer is affected.

Trusted publishing is the target mechanism, but it cannot bootstrap a scope. A
trusted publisher is configured per package on npmjs.com, so at t=0 there is no
package to configure one on. npm also does not validate the configuration on
save, so a mistake surfaces only as a failed publish.

## Decision

- The scope is a free npm **org** named `discord-ts-dev`, not a user account:
  eight packages with independent version lines need more than one maintainer.
  The name follows the GitHub organization rather than the brand, the same way
  `@nestjs` does.
- `release.yml` publishes all eight in one `changeset publish`, with provenance,
  in the topological order Changesets already computes. Internal dependency
  ranges settle at versioning time, so `common` always precedes `core`.
- The publish step stays gated on `PUBLISH_ENABLED`. Unset, a run versions and
  opens the Version PR but publishes nothing — merging a Version PR is therefore
  not yet a release, which is the last point a human can stop a bad version.
- The first version of each package is published by hand with an npm automation
  token. Each trusted publisher is configured afterwards, with both
  `npm stage publish` and `npm publish` allowed.
- Every package carries `repository` (matching the GitHub repo exactly),
  `bugs.url` and `homepage`. `CHANGELOG.md` and `LICENSE` ship in the tarball;
  per-package READMEs do not, because `apps/docs` is their home.

## Consequences

- `NPM_TOKEN` is a bootstrap credential, not the steady state — npm prefers
  OIDC whenever it is available. Once all eight trusted publishers are verified,
  the token can be revoked and publishing access set to require 2FA and disallow
  tokens. npm is also retiring tokens that bypass 2FA: restricted for account
  changes since Aug 2026, and for direct publishing from Jan 2027. A bootstrap
  token is therefore a months-old workaround with an expiry, not a fallback to
  keep.
- A trusted publisher created today defaults to `npm stage publish` only, and
  `changeset publish` calls `npm publish`. Each one must have `npm publish`
  explicitly ticked, or every later CI publish fails with `ENEEDAUTH`.
- A package with no `repository.url` can still have a trusted publisher saved
  against it; the publish then fails rather than the configuration. So the
  metadata is a publish prerequisite, not a configuration prerequisite.
- Publishable manifests must also carry npm-valid internal ranges, not
  `workspace:*`. Nothing in the repo catches that; see ADR 0013.
- Trusted publishing needs npm >= 11.5.1 and Node >= 22.14, so the workflow pins
  Node 24. Provenance follows automatically from a public repo and public
  package, which leaves `NPM_CONFIG_PROVENANCE` mattering only for the
  hand-bootstrapped publish.
- The first published versions are a patch above the current ones (1.2.1,
  0.4.1, 0.3.2, 0.2.1, 1.0.1): `scripts/github/check-changeset.sh` requires a
  changeset for any `packages/*` change, and a changeset can only declare a
  bump. The bump is truthful — the published artifact did change.
- Merging a Version PR while the gate is closed still consumes the version
  number. Open the gate before the first Version PR merges, not after.

## Rejected

- The `@discord.ts` scope, despite matching the brand: unavailable, and
  organizations cannot be renamed, so waiting on it is not a plan. Scope and
  brand are allowed to differ — `@nestjs` for NestJS is the same shape.
- An npm user account instead of an org: one maintainer, one 2FA method, and no
  way to add a second maintainer without transferring every package.
- Publishing from a laptop: publishes under a personal identity, skips the
  pinned-Node and provenance setup, and leaves no audit trail on `main`.
- Staged publishing as the default (`npm stage publish`): maximum safety, but
  `changeset publish` calls `npm publish`, so adopting it means abandoning
  Changesets for the publish step and an `npm i -g npm@latest` (staged
  publishing needs npm >= 11.15.0; Node 24 bundles 11.6.x). Kept available by
  allowing the action without adopting the flow.
- Shipping per-package READMEs: eight files of prose duplicating
  `apps/docs/content`, free to drift.
- A cosmetic version bump to mark the first publish: fabricates a release with
  no change behind it.
