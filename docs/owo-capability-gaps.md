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
| EnabledGuard + configured guard instances (`@UseGuards(instance)`)  | core, systems |
| Vote reward: `awardVote`                                            | systems |
| Help grouping: `buildHelp`                                          | systems |
| Registry-driven help: `category`/`toggleable`, `helpEntries()`       | common, core, systems |
| Confirm / pager / picker / error embed / `replyEphemeral`           | ux      |
| Author lock: `allowedUserId` on confirm/paginate, `authorLock` guard | ux      |
| Mentions, snowflake, amount parser, word filter, vote payload parse | utils   |
| Native i18n: catalogs, `t`, locale resolution                       | i18n    |

## Queued promotions (ranked by dedupe)

1. **`weightedPick` → `utils`** — [#44](https://github.com/discord-ts-dev/discord.ts/issues/44).
   Three copies inside Paw (`rng.pickRarity`, `slots.pickSymbol`, `lottery.drawWinner`).
2. **Registry-driven help → `common` / `core` / `systems`** — shipped (#45).
   `@Command()`/group `category` + `toggleable`, `DiscordDiscoveryService.helpEntries()`, `buildHelpFromRegistry`/`toggleableNames`. Paw deleted `HELP` (75) and `TOGGLEABLE` (49, now autocomplete-driven), music-bot deleted `COMMANDS` (40).
3. **Guild enabled guard → `systems`, configured guard instances → `core`** — shipped (#46).
   `EnabledGuard(store, { deny? })` enforces `isCommandEnabled`; `resolveGuard` uses configured `{ canActivate }` instances as-is. owo adopts it in `PlayerGuarded`.
4. **Author lock → `ux`** — shipped ([#47](https://github.com/discord-ts-dev/discord.ts/issues/47)).
   `confirm`/`paginate` take `{ allowedUserId }`; `authorLock` guards component handlers. owo adopts it on marriage/reset confirms, dex/zoo pagers, and blackjack buttons; drop/captcha/giveaway stay open, battle/trade stay multi-party app-side.
5. **`FileStore` → `systems`** — shipped ([#48](https://github.com/discord-ts-dev/discord.ts/issues/48), [#54](https://github.com/discord-ts-dev/discord.ts/pull/54)).
   The single-process reference adapter; runs the shared Store conformance suite.
   The production adapter shipped separately as `@discord.ts/redis` ([#52](https://github.com/discord-ts-dev/discord.ts/issues/52), ADR 0011).

## Systems dynamism review (2026-09-18)

Assessed how far `systems` can be refined after ADR 0010 (PR #50): hooks,
generics, policy knobs, runner limits, and stored-value migrations. Verdicts
apply ADR 0009 — capabilities, not a configurable game engine. Consumers
counted in-repo: `apps/owo` is the only app on daily / shop / quests / boards;
`apps/music-bot` and `apps/example` use none of them, and no app calls
`awardVote` or `Store.update` yet. (Afterwards, ADR 0011 added
`@discord.ts/redis`, and `apps/example` demos a leaderboard over it.)

- **Hooks in helpers — reject.** `claimDaily` / `buy` take no callbacks
  (`packages/systems/src/daily.ts:21`, `shop.ts:45`), and side effects run
  after the atomic write either way, so a hook buys interface without
  atomicity. Wrap at the call site (documented in `economy.mdx`). Reopens when
  two apps need the same post-write effect co-located with a helper.
- **Generics over app data — reject.** Inventory is `Record<string, number>`
  (`shop.ts:18`) and `QuestState` is a closed shape (`quest.ts:5`); the Store
  is value-shaped (ADR 0004). Typed wrappers are the app-side recipe
  (`economy.mdx` "Composing"). Reopens when a second app brands ids and a
  shared wrapper shape converges.
- **Daily curve — recipe.** The linear curve is fixed in `daily.ts:36-40`; owo
  only multiplies `amount` before the call
  (`apps/owo/src/commands/daily.command.ts:16-22`). A curve that depends on the
  next streak owns its flow. Reopens when a second app needs that.
- **Shop policies — recipe.** `buy` is price × qty against one balance
  (`shop.ts:45-71`); stock, expiry, taxes, and extra currencies stay app-side
  on `Store.update` (`recipes/custom-purchase.mdx`). Reopens when a second app
  needs the same stock / expiry / tax rule.
- **Guild settings widening — reject.** `GuildSettings` holds `{ disabled }`
  only (`guild-settings.ts:4-6`); extra keys use `guild:<id>:<name>`. The
  deferred table already tracks the reopen condition.
- **Runner limits — reject.** No run parameters, retries, or DLQ
  (`scheduler.ts:7-13,101-111`), and no app consumes `getLastError`. owo closes
  over its Store. Reopens when a second app needs Store-parameterized tasks,
  retries, or cross-process single-flight.
- **Schema and migrations — recipe.** The port is value-shaped with no scan
  (`store.ts:23-44`) and no stored value carries a version
  (`recipes/store-migrations.mdx`). Reopens when #48 `FileStore` or a second
  adapter needs versioned values.
- **Promotion friction — process.** New candidates have at most one consumer;
  the #44–#48 queue is unchanged and stays ranked by dedupe.

ADR 0005's "tasks receive the same `Store`" is satisfied by app wiring
(closure or container), not a runner parameter; `tasks.mdx` documents the
actual contract.

## Documented recipes (no framework code)

- **Word filter vs substring censor** — `apps/docs/content/docs/recipes/word-filter.mdx`.
  `containsBlocked` / `maskBlocked` are word-boundary; OwO-style censor is substring. Different jobs.
- **Vote webhook handler** — `apps/docs/content/docs/recipes/vote-webhook.mdx`.
  Parse and award ship; auth, hosting, and dedupe are app-side.
- **Guild config beyond enable flags** — `apps/docs/content/docs/recipes/guild-config.mdx`.
  `GuildSettings` stays `{ disabled }`; extra keys use `guild:<id>:<name>`.
- **Custom purchases** — `apps/docs/content/docs/recipes/custom-purchase.mdx`.
  Stock, taxes, currencies: checks and writes in one `Store.update`; `buy` stays simple.
- **Store value migrations** — `apps/docs/content/docs/recipes/store-migrations.mdx`.
  Version fields and lazy upgrades; the port has no schema and no key scan.
- **Audience index** — `apps/docs/content/docs/recipes/audience-index.mdx`.
  Capped single-key index for broadcasts; documented scaling ceiling, deliberately not a capability.
- **Prisma for app data** — `apps/docs/content/docs/recipes/prisma.mdx`.
  Provider-registry wiring, ready-listener hydration, and write-through around app tables.
- **Drizzle over bun:sqlite** — `apps/docs/content/docs/recipes/drizzle.mdx`.
  SQL-first app tables with the same provider shape; no native build step.

## Considered, deferred (single consumer)

| Candidate                                         | Why deferred                                                        | Reopens when                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `math` expression evaluator                       | One consumer (`/math`); niche                                       | A second app needs it                                             |
| Unique-sample draw (`pickWinners`)                | One consumer (giveaways)                                            | A second app needs it                                             |
| Premium tiers                                     | Two incompatible shapes (Paw store tiers vs music-bot Prisma plans) | A third app, or a shared design                                   |
| `GuildSettings` widening / arbitrary guild keys   | Recipe instead                                                      | A second app needs it                                             |
| Helper hooks (`onClaim`, `onPurchase`)            | Wrap at the call site; side effects run after the atomic write      | Two apps need the same post-write effect co-located with a helper |
| Generic item / currency / quest types             | Value-shaped Store (ADR 0004); typed wrappers are the recipe        | A second app brands ids and a shared wrapper shape converges      |
| Task `run` Store injection                        | owo closes over its Store; `run` stays parameter-free               | A second app needs Store-parameterized tasks                      |
| Store schema / migration helpers                  | No schema by design; version fields and lazy upgrade is a recipe    | A second adapter needs versioned values, or the port grows a scan |
| `tt` / `fmt`, `readBet`, `purchase`, `replyError` | Thin conveniences over shipped primitives                           | Never as capabilities                                             |

## Ruled out (app-side by decision)

Battle/turn engine and weapon rules, hunt/zoo/autohunt/beehive math, memegen
canvas, trade/giveaway/marriage rules, relations and luck, economy policy
(sell prices, credit mirrors), premium grant logic, dashboard/REST,
`eval`/`broadcastEval` (RCE by design), prefix commands (ADR 0008).

## Original P0–P2 list, resolved

- **P0** — Store port: shipped (ADR 0004). Task runner: shipped (ADR 0005).
  Production Store adapter: shipped (`@discord.ts/redis`, ADR 0011).
- **P1** — daily/streak, `topN`/`rankOf`, amount parser: shipped.
  `weightedPick`: #44. Help from registry: shipped (#45). Guild enable guard: #46.
  Author-only guard: #47.
- **P2** — word filter: shipped; censor recipe documented. Vote reward:
  shipped; webhook recipe documented. i18n: shipped beyond plan.
