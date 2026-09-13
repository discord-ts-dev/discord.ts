# CONTEXT-MAP.md — discord.ts

Multi-context repo. Read the `CONTEXT.md` for each context relevant to the topic. System-wide decisions live in `docs/adr/`.

## Contexts

| Context   | Lives at                  | Covers                                              |
| --------- | ------------------------- | --------------------------------------------------- |
| `common`  | `packages/common/CONTEXT.md` | Foundation: metadata keys, decorators, types, logger |
| `core`    | `packages/core/CONTEXT.md` | Runtime: module, discovery, routing, sync, guards, config |
| `ux`      | `packages/ux/CONTEXT.md`  | Message helpers: confirm dialogs, pagers            |
| `cli`     | `packages/cli/CONTEXT.md` | Runner: dev, shard, deploy, start                   |
| `example` | `apps/example/CONTEXT.md`  | Example bot: wiring commands and events with core   |

Context-specific decisions live in `<context-path>/docs/adr/` next to each `CONTEXT.md`.
