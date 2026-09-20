---
'@discord.ts/core': patch
'@discord.ts/systems': minor
---

Configured guard instances plus `EnabledGuard`. Core `resolveGuard` accepts an already-configured `{ canActivate }` instance and uses it as-is, so constructor arguments survive (`authorLock(...)` builds on this). Systems gains `new EnabledGuard(store, { deny? })` next to `isCommandEnabled`: DMs and un-decorated handlers pass, subcommands toggle by group name, default deny is hardcoded English, apps override with i18n. owo adopts it in `PlayerGuarded`; `enabled.guard.ts` keeps `TOGGLEABLE` only.
