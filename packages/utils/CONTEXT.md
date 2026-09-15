# CONTEXT.md — utils

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Mention id**: a Discord id read from user, role, or channel mention syntax or a raw id. Parsed via `parseMentionId()`.
- **User id**: an id resolved from a slash `User` or a prefix mention/id string. Resolved via `userIdOf()`.
- **Snowflake**: a strict 17-20 digit Discord id shape. Checked via `isSnowflake()`.
- **Prefix message**: a text `Message` as opposed to a slash interaction. Guarded via `isMessage()`.
- **Duration text**: milliseconds as `Xs`, `Xm Ys`, `Xh Ym`, or `Xd Xh`. Formatted via `formatTime()`.
- **Progress bar**: a `▓`/`░` bar with percent. Built via `progressBar()`.
- **Amount**: a bet or transfer size. Parsed via `parseAmount()`.
- **Blocked word**: an entry in a blocklist. Checked via `containsBlocked()`, redacted via `maskBlocked()`.
- **Vote payload**: a bot-list webhook body. Parsed via `parseVotePayload()`.
