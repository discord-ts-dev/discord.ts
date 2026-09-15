---
'@discord.ts/utils': minor
'@discord.ts/systems': minor
---

Move pure helpers to `@discord.ts/utils`: `parseAmount()`, `containsBlocked()` / `maskBlocked()`, and `parseVotePayload()`. They need no `Store`, so `systems` is left with the Store-backed halves - `awardVote()` stays there.
