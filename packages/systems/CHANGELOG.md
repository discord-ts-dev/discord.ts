# @discord.ts/systems

## 0.2.0

### Minor Changes

- 08475ce: New systems package (zero deps): Store port plus MemoryStore, TaskRunner scheduler, daily streaks, quests with reroll, leaderboards, shop and inventory, guild settings, word filter, vote rewards, help builder, prefix sub-routes, amount parser
- e6ea827: Move pure helpers to `@discord.ts/utils`: `parseAmount()`, `containsBlocked()` / `maskBlocked()`, and `parseVotePayload()`. They need no `Store`, so `systems` is left with the Store-backed halves - `awardVote()` stays there.

### Patch Changes

- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
