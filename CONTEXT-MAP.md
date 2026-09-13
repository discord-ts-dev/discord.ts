# CONTEXT-MAP.md — discord.ts

Multi-context repo. Read the `CONTEXT.md` for each context relevant to the topic. System-wide decisions live in `docs/adr/`.

## Contexts

| Context   | Lives at                  | Covers                                              |
| --------- | ------------------------- | --------------------------------------------------- |
| `core`    | `packages/core/CONTEXT.md` | Framework: modules, decorators, discovery, sync, DI |
| `example` | `apps/example/CONTEXT.md`  | Example bot: wiring commands and events with core   |

Context-specific decisions live in `<context-path>/docs/adr/` next to each `CONTEXT.md`.
