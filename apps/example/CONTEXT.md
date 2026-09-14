# CONTEXT.md — example

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Example bot**: the runnable app in `apps/example`. Wires `common` decorators into the `core` module.
- **Ping command**: the `@Command()` slash-plus-prefix sample. Proves unified discovery and routing.
- **Roll command**: the validated-`@Options()` sample. Proves DTO parsing and checks.
- **Echo prefix command**: the `@PrefixCommand()` sample. Proves text routing.
- **Deploy run**: `bun run deploy` in this app. Syncs slash JSON without login.
- **Shard run**: `bun run dev:shard` in this app. Hits the shard gate, spawns one process per shard via `runShards()`.
- **Moderation bot**: unified slash-plus-prefix commands for `warn`, `warnings`, `kick`, `ban`, `unban`, `timeout`, `clear`, `logs` in one guild.
- **Warn record**: in-memory warning for a user with reason, moderator, time. Keyed by guild plus user.
- **Audit log**: in-memory list of moderation actions. Shown by `logs`, capped FIFO.
- **Log channel**: guild text channel from option `modLogChannelId`, env `MOD_LOG_CHANNEL_ID` wins. Sent via `sendModLog()`. Silent fallback when empty.
