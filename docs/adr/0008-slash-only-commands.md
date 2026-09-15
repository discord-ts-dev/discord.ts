# ADR 0008 — Slash-only command surface

Date: 2026-09-16

Status: accepted

## Context

The framework shipped two command surfaces: slash and prefix. Prefix routing
pulled in `@PrefixCommand` / `@PrefixArgs`, a `prefix` config option, a
`MessageCreate` command listener, a positional DTO fill path, a per-guild
prefix setting, dual-surface `ux` targets, and `CommandContext` — a wrapper
whose main job was to paper over the surface differences. No package was
published; the only consumers were in-repo apps.

## Decision

Remove the prefix surface in full. One command decorator (`@Command`), one
surface, raw `ChatInputCommandInteraction` via `@Context()`. `@SlashCommand`,
`CommandContext`, `@PrefixCommand` / `@PrefixArgs`, `splitArgs()`,
`splitSubroute()`, `isMessage()`, and `setPrefix()` are deleted. Slash
coverage replaces the prefix habits: choices and autocomplete instead of
aliases, `nsfw` / `defaultMemberPermissions` / `contexts` / `dmPermission`
flags instead of per-guild text config.

## Consequences

- Breaking change: `slash` / `prefix` flags, `prefix` config, prefix
  decorators, and `CommandContext` are gone. Handlers take the raw
  interaction.
- `@OnEvent(MessageCreate)` still works: raw event listeners are not the
  command surface.
- Metadata localizations come from `@discord.ts/i18n` catalogs
  (`commands:<name>...` keys) with explicit `LocalizationMap` fields as
  override. Only Discord locale codes are read; other locale dirs log one
  boot warning.

## Rejected

- Deprecation window: nothing was published and the only consumers were
  in-repo, so a shim would only add maintenance.
- Keeping a trimmed `CommandContext`: with one surface it was a passthrough
  over the interaction.
