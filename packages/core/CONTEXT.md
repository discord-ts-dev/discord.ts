# CONTEXT.md — core

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Module**: a NestJS `@Module()` grouping providers, commands, events. Root config via `DiscordModule.forRoot()`.
- **Config**: the `discord.config.ts` file at app root. Declared with `defineConfig()`. Loaded via `forRootAsync()`. Env wins over file.
- **App**: the consumer Nest app that calls `bootstrapApp()`. Example lives in `apps/example`.
- **Standard structure**: soft App convention: `discord.config.ts`, `src/main.ts`, `src/commands/`, `src/events/`. Warn-only, never blocks boot.
- **Discovery**: scan of providers into handler state plus command JSON plus login. Owned by `DiscordDiscoveryService`.
- **Routing**: dispatch of interactions to handlers with guards and validation. Owned by `DiscordRoutingService`, reads `Discovery` state.
- **Guard**: a `CanActivate` check before a command. Used via stock `@UseGuards()`. Reads interaction via `DiscordExecutionContext`.
- **Sync**: push of command JSON to Discord REST. Auto on bootstrap unless `skipRegistration`. Target is global or `development` guilds.
- **Prefix command**: a text invocation `!name args`. Declared with `@PrefixCommand()`. Args injected with `@PrefixArgs()` as `string[]`. Needs `MessageContent` intent.
- **Deploy**: sync without login. Done via `deployWithModule(AppModule)` or `bun run deploy` in the app.
- **Validated options**: an `Options` DTO checked on each call. Required fields plus `class-validator` rules plus stock `@UsePipes()`. Fail replies ephemeral and blocks the handler.
- **Cooldown**: per-user rate limit. Declared with `@Cooldown(seconds)`. Hit replies ephemeral and blocks.
- **Required permissions**: Discord permissions a caller must hold. Declared with `@RequirePermissions(...)`. Missing replies ephemeral and blocks.
- **Sharding**: multi-process gateway split. Tuned via `shardFile` / `shardCount` / `respawn` in `Config`; booted via the `--shards` gate in `bootstrapApp()`, spawned with `runShards()`.
