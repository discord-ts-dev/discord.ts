---
'@discord.ts/common': patch
'@discord.ts/core': minor
---

Store SlashCommand under the unified command key. Discovery runs one branch; `@Command({ slash: true })` + `@Subcommand()` now nests on slash like it already did on prefix. Raw `SLASH_COMMAND_METADATA` still discovers (fallback, removed next major).
