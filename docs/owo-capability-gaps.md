# Framework capability roadmap

Post-Paw state of the framework's capability surface. The Paw app (`apps/owo`,
PR #41) exercised every surface end to end; `replyEphemeral` (PR #42) was the
first promotion it produced. This document is the candidate register: what is
shipped, what is queued, what is a documented recipe, and what is ruled out.
Policy: [ADR 0009](adr/0009-capabilities-not-modules.md) — Capabilities, not
Modules.

## Shipped

| Capability                                                          | Where   |
| ------------------------------------------------------------------- | ------- |
| Store port + `MemoryStore` (ADR 0004)                               | systems |
| Task runner: `defineTask` / interval / daily (ADR 0005)             | systems |
| Daily claim + streaks                                               | systems |
| Leaderboards: `addScore` / `top` / `rankOf`                         | systems |
| Quests: assign / progress / reroll / complete                       | systems |
| Shop + inventory: `buy` / `useItem` / `addBalance`                  | systems |
| Guild settings: enable flags (`isCommandEnabled`)                   | systems |
| Vote reward: `awardVote`                                            | systems |
| Help grouping: `buildHelp`                                          | systems |
| Confirm / pager / picker / error embed / `replyEphemeral`           | ux      |
| Mentions, snowflake, amount parser, word filter, vote payload parse | utils   |
| Native i18n: catalogs, `t`, locale resolution                       | i18n    |

## Queued promotions (ranked by dedupe)

1. **`weightedPick` → `utils`** — [#44](https://github.com/discord-ts-dev/discord.ts/issues/44).
   Three copies inside Paw (`rng.pickRarity`, `slots.pickSymbol`, `lottery.drawWinner`).
2. **Registry-driven help → `common` / `core` / `systems`** — [#45](https://github.com/discord-ts-dev/discord.ts/issues/45).
   Deletes three hand-maintained lists: Paw `HELP` (129), Paw `TOGGLEABLE` (50), music-bot `COMMANDS` (41).
3. **Guild enabled guard → `systems`, configured guard instances → `core`** — [#46](https://github.com/discord-ts-dev/discord.ts/issues/46).
   `isCommandEnabled` shipped; the guard that enforces it stayed app-local.
4. **Author lock → `ux`** — [#47](https://github.com/discord-ts-dev/discord.ts/issues/47).
   Only `pickOne` has `allowedUserId`; five Paw button flows hand-roll checks.
5. **`FileStore` → `systems`** — [#48](https://github.com/discord-ts-dev/discord.ts/issues/48).
   The port shipped with no usable production adapter. ADR 0009's port exception; amends ADR 0004.

## Documented recipes (no framework code)

- **Word filter vs substring censor** — `apps/docs/content/docs/recipes/word-filter.mdx`.
  `containsBlocked` / `maskBlocked` are word-boundary; OwO-style censor is substring. Different jobs.
- **Vote webhook handler** — `apps/docs/content/docs/recipes/vote-webhook.mdx`.
  Parse and award ship; auth, hosting, and dedupe are app-side.
- **Guild config beyond enable flags** — `apps/docs/content/docs/recipes/guild-config.mdx`.
  `GuildSettings` stays `{ disabled }`; extra keys use `guild:<id>:<name>`.
- **Audience index** — `apps/docs/content/docs/recipes/audience-index.mdx`.
  Capped single-key index for broadcasts; documented scaling ceiling, deliberately not a capability.

## Considered, deferred (single consumer)

| Candidate                                         | Why deferred                                                        | Reopens when                    |
| ------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| `math` expression evaluator                       | One consumer (`/math`); niche                                       | A second app needs it           |
| Unique-sample draw (`pickWinners`)                | One consumer (giveaways)                                            | A second app needs it           |
| Premium tiers                                     | Two incompatible shapes (Paw store tiers vs music-bot Prisma plans) | A third app, or a shared design |
| `GuildSettings` widening / arbitrary guild keys   | Recipe instead                                                      | A second app needs it           |
| `tt` / `fmt`, `readBet`, `purchase`, `replyError` | Thin conveniences over shipped primitives                           | Never as capabilities           |

## Ruled out (app-side by decision)

Battle/turn engine and weapon rules, hunt/zoo/autohunt/beehive math, memegen
canvas, trade/giveaway/marriage rules, relations and luck, economy policy
(sell prices, credit mirrors), premium grant logic, dashboard/REST,
`eval`/`broadcastEval` (RCE by design), prefix commands (ADR 0008).

## Original P0–P2 list, resolved

- **P0** — Store port: shipped (ADR 0004). Task runner: shipped (ADR 0005).
- **P1** — daily/streak, `topN`/`rankOf`, amount parser: shipped.
  `weightedPick`: #44. Help from registry: #45. Guild enable guard: #46.
  Author-only guard: #47.
- **P2** — word filter: shipped; censor recipe documented. Vote reward:
  shipped; webhook recipe documented. i18n: shipped beyond plan.
