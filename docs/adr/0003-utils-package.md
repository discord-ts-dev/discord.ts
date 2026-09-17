# ADR 0003 — `@discord.ts/utils` package for pure helpers

Date: 2026-09-14

Status: accepted. The prefix-coercion consumer is gone per ADR 0008; the
helpers stay.

## Context

Mention and id parsing lived in two places: `core` prefix DTO fill and the
example moderation helpers. Both need the same checks, and any dual
slash-plus-prefix bot needs them too.

## Decision

- New `packages/utils` with zero framework deps: `parseMentionId()`,
  `userIdOf()`, `isSnowflake()`, `isMessage()`.
- `core` prefix coercion and the example import from it. No new decorator.
- Domain actions (audit read, clear, timeout) stay example-side per ADR 0002.

## Consequences

- One canonical mention parser. New pure helpers land in `utils`, never in
  `core` runtime or in app code first.

## Skipped

- Folding the helpers into `common` (metadata foundation, wrong seam).
- A moderation package (three example-side functions do not justify one).
