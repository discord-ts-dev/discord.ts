# CONTEXT-MAP.md — discord.ts

Multi-context repo. Read the `CONTEXT.md` for each context relevant to the topic. System-wide decisions live in `docs/adr/`.

## Contexts

| Context     | Lives at                      | Covers                                                                                           |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `common`    | `packages/common/CONTEXT.md`  | Foundation: metadata keys, decorators, types, logger                                             |
| `core`      | `packages/core/CONTEXT.md`    | Runtime: module, discovery, routing, sync, guards, config                                        |
| `utils`     | `packages/utils/CONTEXT.md`   | Pure helpers: mentions, ids, message guards, amounts, word filter, weighted picks                |
| `i18n`      | `packages/i18n/CONTEXT.md`    | Native i18n: namespaced catalogs, translate, locales                                             |
| `systems`   | `packages/systems/CONTEXT.md` | Store-backed systems: tasks, daily, quests, shop, leaderboard, guild settings, help, vote reward |
| `redis`     | `packages/redis/CONTEXT.md`   | Redis Store adapter: Bun-native client, provider helpers                                         |
| `ux`        | `packages/ux/CONTEXT.md`      | Message helpers: confirm dialogs, pagers                                                         |
| `cli`       | `packages/cli/CONTEXT.md`     | Runner: dev, shard, deploy, start                                                                |
| `example`   | `apps/example/CONTEXT.md`     | Example bot: wiring commands and events with core                                                |
| `music-bot` | `apps/music-bot/CONTEXT.md`   | Music bot: Lavalink queue, playlists, filters, premium                                           |
| `owo`       | `apps/owo/CONTEXT.md`         | Paw bot: clean-room OwO clone, hunting, zoo, pawcoins                                            |
| `docs`      | `apps/docs/CONTEXT.md`        | Docs site: Fumadocs content, meta, site meta                                                     |

Context-specific decisions live in `<context-path>/docs/adr/` next to each `CONTEXT.md`.
