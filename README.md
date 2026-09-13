# discord.ts

![CI](https://github.com/discord-ts-dev/discord.ts/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/discord-ts-dev/discord.ts/actions/workflows/release.yml/badge.svg)

NestJS-style Discord bot framework. OOP, DI, lifecycle, decorators on top of `discord.js` v14.

```ts
@Injectable()
export class PingCommand {
  @SlashCommand({ name: 'ping', description: 'Reply with pong' })
  async handle(@Context() interaction: ChatInputCommandInteraction) {
    await interaction.reply('pong');
  }
}
```

## Packages

- `packages/common` — `@discord.ts/common`: metadata keys, decorators, types, logger
- `packages/core` — `@discord.ts/core`: module, discovery, routing, sync, guards, config
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

- `@SlashCommand` / `@Subcommand` + group factory, `@ContextMenu`, `@Button` + selects, `@Modal`, `@Autocomplete`, `@OnEvent` / `@OnceEvent`
- `@Context()` + `@Options()` DTO with `@StringOption()` etc, required check, `class-validator`, stock `@UsePipes()`
- Stock `@UseGuards()` plus `@Cooldown(seconds)` and `@RequirePermissions(...)`
- `@PrefixCommand()` + `@PrefixArgs()` text commands
- Auto slash sync (global or `development` guilds), `skipRegistration`, `deployWithModule()` for CI
- `confirm()` and `paginate()` UX helpers, sharding passthrough

## Docs

Glossary map at `CONTEXT-MAP.md`. Skills config in `AGENTS.md`.

## Release

Changesets on `main` open a Version PR. Merge publishes to npm with provenance.
Touch `packages/*`? Run `bunx changeset`. Tags like `@discord.ts/core@0.2.0` are publish output.
