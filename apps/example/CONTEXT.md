# CONTEXT.md — example

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Example bot**: the runnable app in `apps/example`. Wires `common` decorators into the `core` module.
- **Ping command**: the `@Command()` sample. Proves discovery and routing.
- **Quest command**: the group-class sample. One `@Subcommand()` per method serves `/quest rr`.
- **Roll command**: the validated-`@Options()` sample. Proves DTO parsing and checks.
- **Deploy run**: `bun run deploy` in this app. Syncs slash JSON without login.
- **Shard run**: `bun run dev:shard` in this app. Hits the shard gate, spawns one process per shard via `runShards()`.
- **Moderation bot**: slash moderation commands for `warn`, `warnings`, `kick`, `ban`, `unban`, `timeout`, `clear`, `logs` in one guild.
- **Warn record**: in-memory warning for a user with reason, moderator, time. Keyed by guild plus user.
- **Audit log**: in-memory list of moderation actions. Shown by `logs`, capped FIFO, with a Discord native audit fallback when empty.
