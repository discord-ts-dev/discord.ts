---
'@discord.ts/core': minor
---

Deepen Discovery with `CommandDefinition`: decorator metadata becomes one
definition per top-level command (flags, options DTO, localizations, and a
plain handler or subcommand tree). `DiscordDiscoveryService.slash` becomes
`commands`; JSON rendering, boot Validation, dispatch matching, and argument
building consume definitions instead of re-reading Reflect metadata.
Structural conflicts (duplicate leaves, flag drift, plain/sub mixing) are
recorded by the builder and aggregated by `validateDiscoveryState()` as before,
so the one-error-before-REST behavior is unchanged. `optionsDto` is removed
from `discord-args`.
