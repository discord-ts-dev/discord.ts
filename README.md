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

- `packages/common` — `@discord-ts-dev/common`: metadata keys, decorators, types, logger
- `packages/core` — `@discord-ts-dev/core`: module, discovery, routing, sync, guards, config
- `packages/utils` — `@discord-ts-dev/utils`: pure helpers, mentions, ids, durations
- `packages/systems` — `@discord-ts-dev/systems`: store, scheduler, daily, quests, leaderboard, shop
- `packages/redis` — `@discord-ts-dev/redis`: Redis Store adapter and providers for multi-process bots
- `packages/ux` — `@discord-ts-dev/ux`: confirm dialogs, pagers
- `packages/cli` — `@discord-ts-dev/cli`: the `discord` runner
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
- Command and option metadata localizations from `@discord-ts-dev/i18n` catalogs, plus explicit `LocalizationMap` fields
- `@UseGuards()` plus `@Cooldown(seconds)` and `@RequirePermissions(...)`
- Auto slash sync (global or `development` guilds), `skipRegistration`, `deployWithModule()` for CI
- `confirm()` and `paginate()` UX helpers, sharding passthrough

## Docs

Glossary map at `CONTEXT-MAP.md`. Skills config in `AGENTS.md`.

## Agent skill

`discord-bot` teaches an agent the order of operations for shipping a bot that works in a real guild: intents and permissions, the interaction deadline, one reply per interaction, author-locked dialogs, state that survives a restart, and the gates to run.

```bash
npx skills add discord-ts-dev/discord.ts --skill discord-bot
```

Symlinks into `.agents/skills/`, or `~/.config/opencode/skills/` with `-g`. Try it without installing anything with `npx skills use discord-ts-dev/discord.ts@discord-bot`. Add `-a opencode` to target one agent, `--all` to take every skill in the repo.

Inside a discord.ts checkout every path it cites resolves. Installed elsewhere, the Discord platform rules still apply and the framework pointers do not.

## Release

Changesets on `main` open a Version PR. Touch `packages/*`? Run `bunx changeset`.
Tags like `@discord-ts-dev/core@0.2.0` are publish output.

Publishing is gated on the `PUBLISH_ENABLED` repository variable. Unset, a run
versions and opens the Version PR but publishes nothing — merging it is not yet
a release.

The first publish of a scoped package cannot use OIDC: a trusted publisher is
configured per package on npmjs.com, so npm has nothing to match a token
against until the package exists. Publish the first version of each package by
hand, add its trusted publisher (with `npm publish` explicitly allowed), then
open the gate:

```bash
gh secret set NPM_TOKEN --body ...       # bootstrap only
gh variable set PUBLISH_ENABLED --body true
```

`NPM_TOKEN` is a fallback, not the steady state — npm prefers OIDC when it is
available. Once every trusted publisher is verified, revoke the token and set
publishing access to require 2FA and disallow tokens. See
[ADR 0012](docs/adr/0012-gated-publish-with-hand-bootstrap.md).

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
