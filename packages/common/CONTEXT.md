# CONTEXT.md — common

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Command**: a slash invocation `/name`. Declared with `@Command()`. Method-level.
- **Subcommand**: a child of a command or group. Declared with `@Subcommand()`. Group made with `createCommandGroupDecorator()`.
- **Command flags**: `nsfw`, `defaultMemberPermissions`, `contexts`, `dmPermission`. Top-level only; Discord sends them there.
- **Localization map**: partial record of Discord locale codes to strings. Explicit on metadata or filled from the i18n catalog.
- **Context menu**: right-click action on user or message. Declared with `@ContextMenu()`.
- **Component**: button or select menu attached to a message. Declared with `@Button()`, `@StringSelect()`, `@UserSelect()`, `@RoleSelect()`, `@ChannelSelect()`, `@MentionableSelect()`. Matched by `customId`.
- **Modal**: popup form submit. Declared with `@Modal()`. Matched by `customId`.
- **Autocomplete**: suggestion handler for a slash option. Declared with `@Autocomplete()`.
- **Listener**: method that runs on a gateway event. Declared with `@OnEvent()` / `@OnceEvent()`. Event is a Discord `Events` value.
- **Context**: the interaction object for current call. Injected with `@Context()`.
- **Guild**: the guild of the current call, null in DMs. Injected with `@Guild()`.
- **Author**: the calling user (`message.author` or `interaction.user`). Injected with `@Author()`.
- **Locale**: the Discord locale of the current call. Injected with `@Locale()`.
- **Options**: validated DTO for slash options. Injected with `@Options()`. Fields use `@StringOption()` etc.
- **Logger**: scoped signale output via `DiscordLogger(context)`. Color accents via `styleText` at call sites.
- **Provider**: a class or `{ provide, useValue }` pair registered in `@Module({ providers })`. The provider registry constructs each class once per App.
- **Inject**: a constructor-parameter declaration naming the token it resolves from. `@Inject(TOKEN)`.
