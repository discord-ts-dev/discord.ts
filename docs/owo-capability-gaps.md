# OwO capability gaps — ranked build list

Sources: OwO Bot wiki `All_Commands`, top.gg, Shiroko
(`xiro-discord-bot-music`), `discord.js-template-v14`.
Reference bots agreed: Shiroko + template. Music/voice stays app-side.

Rule: the framework ships opt-in **Capabilities** (decorators, helpers,
guards, ports), never **Modules** (economy, hunt, battle rules) and
never a forced bot style. Targets below: `→ utils` is a pure helper in
`packages/utils`, `→ ux` a message helper in `packages/ux`,
`→ systems` a Store-backed capability in `packages/systems`.

## P0 — unlocks everything (decided)

- `Store` port + memory adapter — ADR 0004.
- Task runner (boot + interval/cron, jitter, single-flight) — ADR 0005.

## P1 — high reuse, small

- Daily-reset + streak helper over `Store` → `systems` (`daily`, quest
  windows, checklist; streak lost after N misses).
- Leaderboard `topN` / `rankOf` over sorted sets → `systems` (`top`,
  `my`, per-category, server + global scope).
- Author-only interaction guard → `ux` (button/select author lock).
- Amount parser (`number | all | max`) → `utils` (`slots all`, `give`).
- Auto-`help` from the command registry. `buildHelp()` groups metadata
  → `systems`; registry-driven assembly is still open.
- Guild settings + enable/disable guard over `Store` → `systems`
  (`disable` / `enable`).
- `weightedPick()` loot helper → `utils` (hunt tiers,
  first-drop-guaranteed, crate odds).

## P2 — nice to have

- Word-filter helpers in `utils` (`containsBlocked` / `maskBlocked`);
  the `censor` / `uncensor` command recipe is open.
- Vote-webhook reward: payload parse in `utils`, `awardVote()` over
  `Store` in `systems`.
- i18n pattern lifted from the template (doc, not a framework dep).

## Never framework (app-side)

Battle/turn engine, entity stats and XP curves, canvas profile and meme
images, music/voice queue, relation graph and luck rules, shop/quest
reward rules, dashboard/REST. Game rules are bot style.

## OwO coverage sketch

| OwO system                                              | Framework gives              | Bot builds                  |
| ------------------------------------------------------- | ---------------------------- | --------------------------- |
| Economy (`daily`, `give`, `shop`, `quest`, `checklist`) | P0 + streak + amount         | wallet/shop/quest rules     |
| Hunt/collect (`hunt`, `zoo`, `lootbox`, `autohunt`)     | `weightedPick`, tasks, store | tiers, inventory, idle math |
| Battle RPG (`battle`, `team`, `weapon`)                 | buttons (native), confirm    | stats, engine, log          |
| Gambling (`slots`, `coinflip`, `blackjack`)             | amount, `weightedPick`       | odds, pools                 |
| Social (`marry`, `pray`, `profile`)                     | store                        | graph, luck, canvas         |
| Rankings (`top`, `my`)                                  | `topN` / `rankOf`            | categories                  |
| Passive (`owo` → cowoncy, chat XP)                      | events + window cooldowns    | rates, caps                 |
