# CONTEXT.md — utils

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Mention id**: a Discord id read from user, role, or channel mention syntax or a raw id. Parsed via `parseMentionId()`.
- **User id**: an id resolved from a slash `User` or a prefix mention/id string. Resolved via `userIdOf()`.
- **Snowflake**: a strict 17-20 digit Discord id shape. Checked via `isSnowflake()`.
- **Prefix message**: a text `Message` as opposed to a slash interaction. Guarded via `isMessage()`.
