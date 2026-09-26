---
name: discord-bot
description: "Build and change Discord bots on `@discord.ts/*` and its discord.js v14 base. Use when adding or fixing a slash command, context menu, component, or event listener; when a command typechecks but silently does nothing; for intents, gateway permissions, or role hierarchy; for command registration and deploy propagation; for interaction deadlines, rate limits, ephemeral replies, or unwanted pings; for guild state that must survive a restart; for sharding or deploying a bot; or when porting discord.js code to `@discord.ts/*`."
compatibility: opencode
---

# Discord bot

A bot can typecheck, register its commands, log a clean route table, and still be dead in a guild. This is the order of operations for shipping one that works: find the surface, declare it, wire it, answer it, persist it, prove it.

## Two rules that hold everywhere

**Silent failure.** A handler that throws produces no user-visible error. `DiscordRoutingService.invoke` catches and logs it so the gateway loop survives (`packages/core/src/discovery/discord-routing.service.ts:143`) — the user sees nothing at all. Every handler owns its failure reply; a bare `throw` is a missing feature.

**One reply.** An interaction is answered exactly once: `reply`, or `deferReply` and then `editReply` / `followUp`. The first response has a deadline (`references/platform.md`), and a handler that awaits something slow before its first reply has already failed. Replying twice surfaces as an API error, not as a second message.

## 1. Find the surface

Before writing a line, name the decorator, the import path, and the page that owns this behaviour.

- Read the context's `CONTEXT.md` through `CONTEXT-MAP.md`, then the ADRs for that area. A deliberate decision you "fix" is a regression.
- `references/discordjs-map.md` — arriving from discord.js habits, the traps are collected there.
- One surface, one page: `apps/docs/content/docs/core/*.mdx` is the framework's own reference. `references/commands.md` holds what that page does not tell you.
- No bot in the repo yet? Copy the wiring from `apps/example/` — it is the minimal correct shape. The prefix surface does not exist (ADR-0008).

**Where the code goes.** App code stays app-side. A mechanism with two consumers may be promoted into the framework; a game rule, an economy curve, a moderation kit may not (ADR-0009). Gates in `references/ops.md`, existing verdicts in `docs/owo-capability-gaps.md`.

*Done when you can name the decorator and the import path, and you know whether this is app code or a promotion candidate.*

## 2. Declare

The handler — `@Command()` / `@ContextMenu()` / `@OnEvent()` / `@OnceEvent()` / `@Button()` / select / `@Modal()` / `@Autocomplete()` — its options DTO, its guards.

- `references/commands.md` — declaration shapes, DTOs, choices, autocomplete, guards, and the value-import trap that boot rejects.
- `references/platform.md` — the limits that decide your option shape, and the deadline that decides whether you defer.

*Done when the handler exists, typechecks, and its first-response strategy is chosen: reply now, or defer before the first await.*

## 3. Wire

Provider registration, config, intents, injected tokens. Modules are flat — only the root module's `providers` are read (`apps/docs/content/docs/core/module.mdx`).

- `references/ops.md` — config precedence, secrets, intents, deploy.

*Done when the route table logs your route at boot.*

## 4. Answer

Every path the user can take ends in exactly one reply: success, validation failure, guard denial, and thrown error each get their own answer.

- `references/platform.md` — ephemeral vs public, `allowedMentions`, rate limits, the double-reply errors.
- `references/state.md` — collectors, author locks, pagination, and what `deliver()` returning `null` means.

*Done when success, rejection, and failure each produce one reply, and all of them land inside the deadline.*

## 5. Persist

Only when state outlives the process. Read `references/state.md` first: keys go through the Store's key contract, `update()` is the atomic unit, and read-then-write is a race.

*Done when the state survives a restart, and a second process cannot corrupt it.*

## 6. Prove

- `references/ops.md` — the gates, the deploy, the dev-guild smoke test.

*Done when the command appears in a real guild and works.*
