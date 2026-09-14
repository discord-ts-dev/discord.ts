# CONTEXT.md — systems

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Store**: the async key/value plus sorted-set port every system reads
  and writes through. Implemented by `MemoryStore`, plugged by adapters.
- **Task**: a named unit of scheduled work. Declared with `defineTask()`,
  run at boot plus on interval or daily time. Owned by `TaskRunner`.
- **Daily**: a once-per-reset-window currency claim. Claimed via
  `claimDaily()`, resets at `dailyAt` in a fixed time zone.
- **Streak**: consecutive daily claims. Broken after `streakGraceDays`
  missed windows, then restarts at one.
- **Leaderboard**: a ranked score board. Written via `addScore()`, read
  via `top()` and `rankOf()`.
- **Quest**: a daily goal from a pool with progress. Assigned via
  `assignQuest()`, advanced via `addProgress()`, swapped once per window
  via `rerollQuest()`, cashed out via `completeQuest()`.
- **Shop**: balance plus inventory. Bought via `buy()`, consumed via
  `useItem()`, topped up via `addBalance()`.
- **Guild settings**: per-guild prefix and per-command enable flags.
  Read via `getSettings()`, toggled via `setCommandEnabled()`.
- **Word filter**: a blocked-word list check. Checked via
  `containsBlocked()`, redacted via `maskBlocked()`.
- **Vote reward**: currency for a bot-list vote webhook. Parsed via
  `parseVotePayload()`, awarded via `awardVote()`.
- **Help entries**: grouped command metadata. Built via `buildHelp()`.
- **Sub-route**: a prefix arg split into route plus rest. Split via
  `splitSubroute()`.
- **Amount**: a bet or transfer size. Parsed via `parseAmount()`.
