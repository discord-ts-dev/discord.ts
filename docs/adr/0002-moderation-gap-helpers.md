# ADR 0002 — Moderation gap helpers (prefix DTO, ux dual surface, bot guard)

Date: 2026-09-14

## Context

The moderation example needed ten `discord.js` features with no OOP/DI/decorator
shape: prefix user resolve, rest-of-line reason, embed confirm, message pager,
log channel config, bot permissions, audit wrapper, filtered clear, timeout
helper, error embed. Each could grow its own abstraction.

## Decision

- Prefix DTO fills positionally; trailing free text joins into a final string
  field; user/role/channel mentions coerce to ids (`parseMentionId`). No new
  decorator. Full User fetch stays in handlers.
- `confirm()` and `paginate()` accept an interaction or a prefix `Message`,
  and `confirm()` accepts text or an embed payload. One function per surface,
  branched by property checks.
- New `@RequireBotPermissions()` plus `BotPermissionsGuard`, registered next
  to the existing guards. Checks the bot member, not the caller.
- `modLogChannelId` joins `DiscordModuleOptions`; env `MOD_LOG_CHANNEL_ID`
  wins. `sendModLog()`, `getAuditEntries()`, `bulkClear()`, `applyTimeout()`,
  `errorEmbed()` are thin wrappers. Example keeps bounded in-memory warn/audit
  stores, FIFO evict, no DB.

## Consequences

- Prefix `!warn @u spamming links` works unquoted; quoted input still works.
- `ban`/`clear` confirm and `warnings`/`logs` paging work on both surfaces.
- Callers declare both sides: `@RequirePermissions` for the user,
  `@RequireBotPermissions` for the bot.

## Skipped

- Async User fetch inside DTO fill (needs guild at parse time; stays manual).
- Per-guild log channel store (env plus option covers the example; DB later).
- Automod wrappers (out of moderation V1 scope).
