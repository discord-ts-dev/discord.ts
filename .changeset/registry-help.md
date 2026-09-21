---
'@discord.ts/common': minor
'@discord.ts/core': minor
'@discord.ts/systems': minor
---

Registry-driven help and toggleable commands. `@Command()` and group metadata carry `category` and
`toggleable` (top level only; sub-level values warn at boot). `DiscordDiscoveryService.helpEntries()`
returns one `HelpEntry` per top-level command — a group counts once, by group name — with
descriptions merged from the i18n catalog; the service is injectable via the new `DISCORD_DISCOVERY`
token. Systems adds `buildHelpFromRegistry()` (locale-resolved sections) and `toggleableNames()`.
Validation now errors on an `@Options()` DTO erased by `import type` (`DTO resolved to Object`).
Paw deletes its `HELP` and `TOGGLEABLE` lists — `/enable` and `/disable` pick from the registry via
autocomplete — and music-bot deletes its `COMMANDS` list.
