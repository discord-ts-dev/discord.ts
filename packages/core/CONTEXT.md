# CONTEXT.md — core

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Module**: a NestJS `@Module()` grouping providers, commands, events. Root config via `DiscordModule.forRoot()`.
- **Config**: the `discord.config.ts` file at app root. Declared with `defineConfig()`. Loaded via `forRootAsync()`. Env wins over file.
- **App**: the consumer Nest app that calls `forRootAsync()`. Example lives in `apps/example`.
- **Standard structure**: soft App convention: `discord.config.ts`, `src/main.ts`, `src/commands/`, `src/events/`. Warn-only, never blocks boot.
- **Logger**: scoped signale + chalk output via `DiscordLogger(context)`. Startup lists each Slash, Menu, Prefix, Event plus counts, like Nest routes.
- **Command**: a slash invocation `/name`. Declared with `@SlashCommand()`. Method-level.
- **Subcommand**: a child of a command or group. Declared with `@Subcommand()`. Group made with `createCommandGroupDecorator()`.
- **Context menu**: right-click action on user or message. Declared with `@ContextMenu()`.
- **Component**: button or select menu attached to a message. Declared with `@Button()`, `@StringSelect()`, `@UserSelect()`, `@RoleSelect()`, `@ChannelSelect()`, `@MentionableSelect()`. Matched by `customId`.
- **Modal**: popup form submit. Declared with `@Modal()`. Matched by `customId`.
- **Autocomplete**: suggestion handler for a slash option. Declared with `@Autocomplete()`.
- **Listener**: method that runs on a gateway event. Declared with `@OnEvent()` / `@OnceEvent()`. Event is a Discord `Events` value.
- **Context**: the interaction object for current call. Injected with `@Context()`.
- **Options**: validated DTO for slash options. Injected with `@Options()`. Fields use `@StringOption()` etc.
- **Guard**: a `CanActivate` check before a command. Used via stock `@UseGuards()`. Reads interaction via `DiscordExecutionContext`.
- **Sync**: push of command JSON to Discord REST. Auto on bootstrap unless `skipRegistration`. Target is global or `development` guilds.
- **Prefix command**: a text invocation `!name args`. Declared with `@PrefixCommand()`. Args injected with `@PrefixArgs()` as `string[]`. Needs `MessageContent` intent.
- **Deploy**: sync without login. Done via `deployWithModule(AppModule)` or `bun run deploy` in the app.
- **Validated options**: an `Options` DTO checked on each call. Required fields plus `class-validator` rules plus stock `@UsePipes()`. Fail replies ephemeral and blocks the handler.
- **Cooldown**: per-user rate limit. Declared with `@Cooldown(seconds)`. Hit replies ephemeral and blocks.
- **Required permissions**: Discord permissions a caller must hold. Declared with `@RequirePermissions(...)`. Missing replies ephemeral and blocks.
- **Confirm**: a Yes/No button dialog. `confirm()` returns true on accept, false on cancel or timeout.
- **Pager**: prev/next embed navigation. `paginate()` handles buttons until timeout.
- **Sharding**: multi-process gateway split. Tuned via `shardFile` / `shardCount` / `respawn` in `Config`; booted via the `--shards` gate in `main.ts`, spawned with `runShards()`.
