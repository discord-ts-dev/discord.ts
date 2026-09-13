# CONTEXT.md — example

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Example bot**: the runnable app in `apps/example`. Wires `core` providers into an `AppModule`.
- **Ping command**: the minimal `@SlashCommand()` sample. Proves discovery and routing.
- **Roll command**: the validated-`@Options()` sample. Proves DTO parsing and checks.
- **Echo prefix command**: the `@PrefixCommand()` sample. Proves text routing.
- **Deploy run**: `bun run deploy` in this app. Syncs slash JSON without login.
