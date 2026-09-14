# ADR 0005 — Task runner for scheduled jobs

Date: 2026-09-14

## Context

Daily reset at fixed TZ, streak windows, autohunt idle ticks, and
reminders all need scheduled work. Today each bot hand-rolls timers:
nothing standard to reset dailies, expire cooldown windows, or run
background ticks against the `Store` port (ADR 0004).

## Decision

- The framework ships a minimal task runner: tasks declared beside
  commands, run at boot plus on interval/cron, with jitter and
  single-flight per task so overlapping ticks never double-award.
- The framework owns scheduling only. Job bodies (reset logic, tick
  rules, reward math) stay app-side — game rules are bot style, not
  framework.
- Tasks receive the same `Store` the commands use, so daily jobs and
  command handlers share counters.

## Consequences

- `daily` reset, checklist windows, and autohunt-style ticks become
  declarative. Long jobs stay app-side; the runner is not a queue.

## Skipped

- A full job queue (BullMQ/pg-boss): right call for fleets with
  retries and DLQs, but a forced infra dep. Apps outgrow into it;
  the runner covers single-process bots and dev.
