# CONTEXT.md — common

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Command**: a slash invocation `/name`. Declared with `@SlashCommand()`. Method-level.
- **Subcommand**: a child of a command or group. Declared with `@Subcommand()`. Group made with `createCommandGroupDecorator()`.
- **Context menu**: right-click action on user or message. Declared with `@ContextMenu()`.
- **Component**: button or select menu attached to a message. Declared with `@Button()`, `@StringSelect()`, `@UserSelect()`, `@RoleSelect()`, `@ChannelSelect()`, `@MentionableSelect()`. Matched by `customId`.
- **Modal**: popup form submit. Declared with `@Modal()`. Matched by `customId`.
- **Autocomplete**: suggestion handler for a slash option. Declared with `@Autocomplete()`.
- **Listener**: method that runs on a gateway event. Declared with `@OnEvent()` / `@OnceEvent()`. Event is a Discord `Events` value.
- **Context**: the interaction object for current call. Injected with `@Context()`.
- **Options**: validated DTO for slash options. Injected with `@Options()`. Fields use `@StringOption()` etc.
- **Logger**: scoped signale output via `DiscordLogger(context)`. Color accents via chalk at call sites.
