# discord.ts

![CI](https://github.com/discord-ts-dev/discord.ts/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/discord-ts-dev/discord.ts/actions/workflows/release.yml/badge.svg)

NestJS-style Discord bot framework without NestJS. OOP, DI, lifecycle, decorators on top of `discord.js` v14.

```ts
@Injectable()
export class PingCommand {
  @Command({ name: 'ping', description: 'Reply with pong' })
  async handle(@Context() interaction: ChatInputCommandInteraction) {
    await interaction.reply('pong');
  }
}
```

## Packages

- `packages/common` — `@discord.ts/common`: metadata keys, decorators, types, logger
- `packages/core` — `@discord.ts/core`: module, discovery, routing, sync, guards, config
- `packages/utils` — `@discord.ts/utils`: pure helpers, mentions, ids, durations
- `packages/systems` — `@discord.ts/systems`: store, scheduler, daily, quests, leaderboard, shop
- `packages/ux` — `@discord.ts/ux`: confirm dialogs, pagers
- `packages/cli` — `@discord.ts/cli`: the `discord` runner
- `apps/example` — runnable sample bot

## Quick start

```bash
bun install
bun run build
cd apps/example
DISCORD_TOKEN=... DISCORD_CLIENT_ID=... DISCORD_GUILD_ID=... SKIP_REGISTRATION=false bun run deploy
DISCORD_TOKEN=... bun run dev
```

## Features

- `@Command` / `@Subcommand` + group factory, `@ContextMenu`, `@Button` + selects, `@Modal`, `@Autocomplete`, `@OnEvent` / `@OnceEvent`
- `@Context()` + `@Options()` DTO with `@StringOption()` etc, required check, `class-validator`, `@UsePipes()`
- Command and option metadata localizations from `@discord.ts/i18n` catalogs, plus explicit `LocalizationMap` fields
- `@UseGuards()` plus `@Cooldown(seconds)` and `@RequirePermissions(...)`
- Auto slash sync (global or `development` guilds), `skipRegistration`, `deployWithModule()` for CI
- `confirm()` and `paginate()` UX helpers, sharding passthrough

## Docs

Glossary map at `CONTEXT-MAP.md`. Skills config in `AGENTS.md`.

## Release

Changesets on `main` open a Version PR. Touch `packages/*`? Run `bunx changeset`.
Tags like `@discord.ts/core@0.2.0` are publish output.

Publishing stays off until npm credentials exist: the first publish of a scoped
package cannot use OIDC (npm answers 404 until the package exists with a
trusted publisher), so add an npm automation token with
`gh secret set NPM_TOKEN --body ...` and `gh variable set PUBLISH_ENABLED --body true`.
Until then merging the Version PR bumps versions without publishing.

Remote cache is Vercel-backed and inert until secrets exist: create a token at
vercel.com (Storage → Remote Cache), then
`gh secret set TURBO_TOKEN --body ...` and `gh secret set TURBO_TEAM --body ...`.
Without them Turbo falls back to the local `actions/cache` silently.

## Docker

```bash
docker build -f apps/example/Dockerfile -t discord-ts-example .
docker run -e DISCORD_TOKEN=... -e DISCORD_CLIENT_ID=... discord-ts-example
```

Single-stage `oven/bun`, runs TS source direct via `bun run start:bun`. No secrets baked in.
