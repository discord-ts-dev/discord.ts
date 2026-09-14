# ADR 0001 — Mirror discord.js `.github/` layout (adapted)

Date: 2026-09-13

## Context

`.github/` held only our own workflows and markdown issue templates.
discord.js keeps community health files, label data, and cache/label
workflows under `.github/`. We want the same shape without breaking
`bun + turbo + changesets` CI.

## Decision

- Add to `.github/`: `COMMIT_CONVENTION.md`, `SUPPORT.md`, `labels.yml`,
  `labeler.yml`, `issue-labeler.yml`, `ISSUE_TEMPLATE/*.yml` (bug + feature),
  `workflows/label-sync.yml`, `workflows/cleanup-cache.yml`.
- Map labels to our 5 contexts (`common/core/ux/cli/example`); keep the
  five triage roles in `docs/agents/triage-labels.md`.
- Keep all existing workflows, `actions/setup`, root `CODEOWNERS`,
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` where they are. Delete nothing
  except the two superseded `.md` issue templates.
- Wire `issue-labeler.yml` through a job in `workflows/triage.yml`.

## Consequences

- `label-sync` owns label names from `labels.yml`; PR areas come from
  `labeler.yml` plus `triage-label.mjs`; issue areas come from the
  Area dropdown via `issue-labeler`.
- `cleanup-cache` deletes per-PR turbo/bun caches on PR close.

## Skipped

- `.kodiak.toml` (Kodiak is sunset), `tsc.json` problem-matcher (we use
  `tsc --noEmit`), `powered-by-*` images (sponsor banners, not needed).
