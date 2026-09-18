# ADR 0009 — Capabilities, not Modules

Date: 2026-09-17

Status: accepted

## Context

The Paw app (`apps/owo`, PR #41) is a clean-room OwO-style bot built entirely
on the framework. It exercised every surface end to end and proved out
mechanisms the framework lacks: weighted loot rolls, registry-driven help, a
guild enable/disable guard, author-locked interactions, and a persistent
non-ORM `Store` adapter. It also showed the cost of the reverse: a generic
helper (`replyEphemeral`) was copy-pasted into seven core sites and two app
helpers before it was promoted (PR #42).

Without a rule, promotion becomes taste. One failure mode absorbs game rules
into the framework and forces a bot style; the other leaves useful mechanisms
app-local so every next bot copies them. This ADR fixes the rule before the
candidate queue widens.

## Decision

The framework ships opt-in **Capabilities** — decorators, helpers, guards,
ports. It never ships **Modules** (economy, hunting, battle rules, XP curves,
canvas art) and never a forced bot style.

A candidate is promoted when it clears all three gates:

1. **Capability**: a mechanism, not a domain rule. Game rules stay app-side.
2. **Consumers (rule of two)**: at least two independent consumers exist —
   two apps, or framework internals plus an app, or two call-site clusters the
   promotion collapses. One consumer is not enough; the answer is a documented
   recipe. Narrow exception: a port that would ship with no usable production
   adapter may bundle one reference adapter on a single consumer.
3. **Adoption**: the promotion deletes or prevents real code. The consumer(s)
   adopt it in the same change.

Ranking when candidates compete: dedupe and consumer pain first, roadmap
completeness second, API completeness never sufficient on its own.

Process: one PR per promotion (batched per package at most), landed after the
branch it derives from; changeset + docs + tests under the 100% coverage gate;
the promoting app adopts in the same PR.

The candidate register with per-item verdicts (promote / document recipe /
never) lives in `docs/owo-capability-gaps.md`.

## Consequences

- App code is the proving ground; framework code is the payoff.
- API asks without a consumer are rejected and answered with a recipe in
  `apps/docs`.
- Deferred candidates are not lost: the register keeps the reason and the
  trigger that would reopen them (a second consumer, a port without an
  adapter).

## Rejected

- Shipping Modules per bot genre (economy, battle, hunt): the framework's
  value is the platform, not the game.
- Promoting on one consumer (expression evaluator, unique-sample draw,
  premium tiers, arbitrary guild config keys): speculative generality.
- Bundling Prisma/Redis: ADR 0004 stands — the port stays thin and apps plug
  real adapters.
