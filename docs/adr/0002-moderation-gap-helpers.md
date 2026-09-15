# ADR 0002 — Moderation gaps (prefix DTO, ux dual surface, bot guard)

Date: 2026-09-14

Status: accepted. The prefix DTO and dual-surface parts are superseded by
ADR 0008; the bot guard and example-side helpers still hold.

## Context

The moderation example needed ten `discord.js` features with no OOP/DI/decorator
shape: prefix user resolve, rest-of-line reason, embed confirm, message pager,
log channel config, bot permissions, audit wrapper, filtered clear, timeout
helper, error embed. Each could grow its own abstraction.

## Decision

- Prefix DTO fills positionally; trailing free text joins into a final string
  field; user/role/channel mentions coerce to ids. No new decorator. Full User
  fetch stays in handlers.
- `confirm()` and `paginate()` accept an interaction or a prefix `Message`,
  and `confirm()` accepts text or an embed payload. One function per surface,
  branched by property checks. `errorEmbed()` is the single failure style.
- New `@RequireBotPermissions()` plus `BotPermissionsGuard`, registered next
  to the existing guards. Checks the bot member, not the caller.
- Audit read, filtered clear, and timeout stay example-side helpers, not core:
  they serve moderation bots only, not general bots. The example keeps bounded
  in-memory warn/audit stores, FIFO evict, no DB, with a Discord native audit
  fallback.

## Consequences

- Prefix `!warn @u spamming links` works unquoted; quoted input still works.
- `ban`/`clear` confirm and `warnings`/`logs` paging work on both surfaces.
- Callers declare both sides: `@RequirePermissions` for the user,
  `@RequireBotPermissions` for the bot.

## Skipped

- Async User fetch inside DTO fill (needs guild at parse time; stays manual).
- Mod log channel send (dropped; in-memory audit plus native audit fallback cover the example).
- Framework moderation kit (`core/src/moderation.ts` removed): domain code in
  a general runtime sets a music-bot/economy-bot precedent. General bits
  (bot guard, DTO fill, ux dual surface) stay; moderation actions stay in the
  example.
- Automod wrappers (out of moderation V1 scope).
