# CONTEXT.md — utils

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Mention id**: a Discord id read from user, role, or channel mention syntax or a raw id. Parsed via `parseMentionId()`.
- **User id**: an id resolved from a `User` object or a mention / id string. Resolved via `userIdOf()`.
- **Snowflake**: a strict 17-20 digit Discord id shape. Checked via `isSnowflake()`.
- **Duration text**: milliseconds as `Xs`, `Xm Ys`, `Xh Ym`, or `Xd Xh`. Formatted via `formatTime()`.
- **Progress bar**: a `▓`/`░` bar with percent. Built via `progressBar()`.
- **Amount**: a bet or transfer size. Parsed via `parseAmount()`.
- **Blocked word**: an entry in a blocklist. Checked via `containsBlocked()`, redacted via `maskBlocked()`.
- **Vote payload**: a bot-list webhook body. Parsed via `parseVotePayload()`.
- **Weighted pick**: a value drawn with probability proportional to its weight. Drawn via `weightedPick()`. A draw, not the `ux` select-menu picker.
- **Weight**: a value's share of a weighted pick, proportional to its chance of being drawn. A value with no share is not in the draw.
