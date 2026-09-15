---
'@discord.ts/common': minor
'@discord.ts/core': minor
'@discord.ts/i18n': minor
---

Add native i18n in the dedicated `@discord.ts/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`
