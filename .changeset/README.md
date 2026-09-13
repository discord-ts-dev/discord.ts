# Changesets

Short-lived markdown files in this folder declare version bumps.
The `release` workflow turns them into a Version PR, then publishes to npm.

```md
---
'@discord.ts/core': minor
---

Add `@Cooldown` docs
```

Run `bunx @changesets/cli` to create one. CI fails a PR that touches
`packages/*` with no changeset (`changeset-status` job).
Tags like `@discord.ts/core@0.2.0` are output of publish, not input.
