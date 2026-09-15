---
'@discord.ts/cli': minor
'@discord.ts/common': patch
'@discord.ts/core': patch
'@discord.ts/i18n': patch
'@discord.ts/systems': patch
'@discord.ts/utils': patch
'@discord.ts/ux': patch
---

Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
