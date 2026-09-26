# Ops

Config, deploy, run, gates — and the list of things that look wrong and are not.

## Config

`defineConfig()` in `discord.config.ts`; it is an identity function, so the file's shape is the type. Precedence is **file → env → overrides**.

Env overlay: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` → `development`, `DISCORD_OWNER_IDS` → `owners`, `SKIP_REGISTRATION`, `SHARD_COUNT`.

Secrets belong in env, never in the config file — the file is committed. A missing `token` or `clientId` throws unless `skipValidation` is set.

**Intents live here.** Adding an event whose intent is not listed is the most common cause of a bot that boots, logs in, and receives nothing. Privileged intents additionally need the portal toggle; see `references/platform.md`.

## Deploy and run

| Command | Does |
| --- | --- |
| `bun run deploy` | `deployWithModule(AppModule)` — syncs command JSON without logging in |
| `bun run dev` | runs TypeScript source through bun |
| `bun run start` | runs `dist` through node |
| `bun run dev:shard` / `start:shard` | the sharded variants |

Sync runs automatically on bootstrap unless `skipRegistration` is set, so a plain `dev` run re-registers every time. What it registers and how it propagates is in `references/commands.md` — the practical consequence is to develop against a dev guild.

Sharding is opt-in. `shardFile` / `shardCount` / `respawn` in the config, `bootstrapApp()` switching on `--shards` in argv, `runShards()` doing the spawning. Under 2500 guilds, leave it off.

## Gates

Before push (`CONTRIBUTING.md`):

```
bun run lint
bun run typecheck
bun run format:check
bun run test
bun run scripts:check
```

`bun run test` is two invocations: `bun test --coverage --preload=./scripts/test-preload.ts packages tests/surface.test.ts`, then `bun run test:apps` (`bun test --preload=… apps`). **Only the first collects coverage**, so `bunfig.toml`'s `coverageThreshold = 1` gates `packages/**` and the surface test — app code is not coverage-gated. `apps/example` has no `tests/` directory; `owo` and `music-bot` do.

The practical consequence: a new app command does not need a test to pass the build, so write one because you want it, not because the gate asks. A new `packages/*` file does need one.

`no-explicit-any` and `max-lines: 300` are lint **errors**; `no-console` warns, which is why the codebase uses `Logger` / `DiscordLogger`.

A changeset (`bunx changeset`) is required for any `packages/*` change. It is not required for app-only work.

## Smoke test

A bot is not proven until the command runs in a real guild. Deploy to the dev guild, type the command, and read the reply. The failure modes separate cleanly:

- **Command absent from the picker** — registration, or `defaultMemberPermissions` hiding it. Check the deploy ran and the guild id is in `development`.
- **Command present, nothing happens** — the intent is not enabled, or the handler threw. Silent failure means the log is the only evidence; look for `handler <method> failed:` in the framework's error output.
- **"Unknown interaction" or an expired token** — the first reply missed the deadline.
- **Works locally, dead after restart** — state was in memory.

## Anti-fix list

Each of these is deliberate. Reading the reason before changing the line is cheaper than the revert.

- **No `paths` map in the root `tsconfig.json`.** It makes `bun test` hang on discovery (ADR-0007). The root config typechecks the tests and nothing else.
- **Turbo's `test` task does not depend on `^build`.** Tests run against workspace sources (ADR-0007).
- **No prefix command surface at all.** `@SlashCommand`, `CommandContext`, `setPrefix`, and friends are gone (ADR-0008).
- **Modules are flat.** Only the root module's `providers` are read.
- **No domain Modules in the framework** (ADR-0009). A moderation kit was removed from `core` for exactly this reason (ADR-0002) — domain code in a general runtime sets a precedent for the next app.
- **Pure helpers land in `utils`**, not in `core` and not in app code first (ADR-0003).
- **The Redis adapter ships; Prisma and Drizzle stay recipes** (ADR-0011).
- **A `ponytail:` comment marks a deliberate shortcut** with its ceiling named. Read it before "fixing" the line — it is the repo's own do-not-refactor marker.
- **`validateDiscoveryState` is not exported** from `@discord.ts/core`; it lives in `discovery/discord-validate.ts` and the package has no subpath export. Read it to understand the boot checks; import it from your app and you will not find it.

## Promotion gates

Moving app code into the framework clears three gates (ADR-0009), all three:

1. **Capability** — a mechanism, not a domain rule. Game rules stay app-side.
2. **Consumers** — at least two independent ones. The narrow exception is a port that would ship with no production adapter.
3. **Adoption** — the promotion deletes or prevents real code. API completeness is never sufficient on its own.

Existing verdicts, promote and reject alike, are in `docs/owo-capability-gaps.md`. App code is the proving ground; framework code is the payoff.
