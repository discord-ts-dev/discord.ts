# discord.ts

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

- `packages/core` — `discord.ts`: module, decorators, discovery, sync, guards, UX helpers
- `apps/example` — runnable sample bot

## Quick start

```bash
bun install
bun run build
cd apps/example
DISCORD_TOKEN=... DISCORD_CLIENT_ID=... DISCORD_GUILD_ID=... SKIP_REGISTRATION=false bun src/deploy.ts
DISCORD_TOKEN=... bun src/main.ts
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
