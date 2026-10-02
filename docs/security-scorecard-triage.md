# Security scorecard triage

Standing record of the OpenSSF Scorecard alerts in GitHub code scanning, which
are a lagging snapshot: an alert is filed when a check drops and cleared when it
recovers, so the list can show `error` for a check that has since improved. The
scorecard API is the source of truth for current state; re-run the
`Scorecard` workflow (`workflow_dispatch`) to refresh it.

Baseline at 2026-10-02: **7.9/10**, repo 19 days old.

## Closed by this change

- **#22 `js/prototype-polluting-assignment`** (CodeQL) — `FileStore` resolved
  `__proto__`/`constructor`/`prototype` against `Object.prototype` instead of
  treating them as stored names. See ADR 0016. No production input reached it.
- **#18 `SASTID`** — was 9/10, failing only "24 of 28 commits checked" because
  `codeql.yml` filtered `push`/`pull_request` to `main`. Filters dropped, so
  every branch is analysed and the check reaches 10.

## Accepted, not fixable by code

- **#12 `MaintainedID`** — Scorecard returns 0 for any repository under 90 days
  old, and returns 0 regardless of commit count. The repo was created
  2026-09-13. **Revisit after 2026-12-12**; no action before then, and adding
  commits or docs cannot move it.
- **#13 `CIIBestPracticesID`** — needs a passing OpenSSF Best Practices badge,
  which is itself earned over a multi-month observation window against ~50
  criteria. Not obtainable on demand. **Revisit with #12.**

## Deliberately left open

- **#1 `BranchProtectionID`** — `main` is fully protected (PRs required, 1
  approving review, codeowner review, stale dismissal, admins included, no
  force pushes, conversation resolution). Scorecard's only remaining warning is
  that the required approving review count is 1, so the check sits at 8/10.
  Raising it to 2 would score 10/10 and make the repo unmergeable: there is one
  maintainer who can approve. 8/10 is the honest score.
- **#11 `CodeReviewID`** — 0/19 approved changesets; 21 of the last 30 merged
  PRs have no human review. `main` requires 1 approving review, and the
  maintainer is in `bypass_pull_request_allowances`, so solo PRs merge through
  a deliberate self-bypass. A one-maintainer repository structurally cannot
  score above 0 here. Kept open as the standing signal that review becomes
  required the moment a second maintainer joins.

## Known-scorecard-irrelevant

`SAST` and `Maintained` are recomputed weekly on Sunday 01:30 UTC. Expect #12
to resolve itself on the first scan after 2026-12-12; nothing needs doing.
