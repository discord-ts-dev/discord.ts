# Commands

Declaring a surface and wiring it. Framework-surface reference lives in `apps/docs/content/docs/core/`; this file holds the decisions that page does not make for you.

## Declaration shapes

`@Command()` is **method-level**; the class stays plain `@Injectable()`. The provider registry scans providers, then methods, then metadata.

- `@Command({ name, description })` — a slash command.
- `@Subcommand({ name, description })` plus `createCommandGroupDecorator({ name, description })` for a group. One level of nesting, and a base command with subcommands is no longer invocable on its own.
- `@ContextMenu({ name, context })` — right-click on a user or a message. The platform takes an **empty** description for both types; check what the framework's boot check does with a menu description before adding one (`packages/core/src/discovery/discord-validate.ts:127` validates the menu name).
- `@Button()`, `@StringSelect()`, `@UserSelect()`, `@RoleSelect()`, `@ChannelSelect()`, `@MentionableSelect()`, `@Modal()` — matched by `customId`.
- `@Autocomplete()` — suggestions for a string option; must target a command that exists.
- `@OnEvent(Events.X)` / `@OnceEvent(Events.X)` — gateway events.

`nsfw`, `defaultMemberPermissions`, `dmPermission`, and `contexts` are **top-level only**. Discord reads them on the top-level command and ignores them on a subcommand, so a flag set on a subcommand silently does nothing.

`defaultMemberPermissions` controls visibility: a member who lacks the permission does not see the command at all. Prefer it over an in-handler check — the command disappears instead of failing.

## Options DTO

A class of option fields, passed to the handler with `@Options()`. Field decorators: `@StringOption`, `@IntegerOption`, `@NumberOption`, `@BooleanOption`, `@UserOption`, `@ChannelOption`, `@RoleOption`, `@MentionableOption`, `@AttachmentOption`, each with `name`, `description`, `required`, and optionally `choices`. Add `class-validator` rules (`@Min`, `@Max`, `@Length`) and apply them with `@UsePipes()`; a validation failure replies ephemeral and blocks the handler.

**Import the DTO as a value, never as a type.** An erased parameter is caught at boot as `@Options() DTO resolved to Object`, which is a confusing way to learn that `import type` dropped your class.

Limits that shape the DTO: 25 options, required before optional, name 1–32, description 1–100, 25 choices per option. Anything dynamic goes to `@Autocomplete()` (25 choices) rather than a hardcoded list. The framework's own name check is narrower than Discord's (`\p{Ll}\p{Nd}_-` at `discord-validate.ts:23`), and it caps `commands + menus` at 100 combined — a stricter, differently shaped rule than the platform's per-type caps, so treat it as the framework's rule rather than Discord's.

## Guards

Built-in decorators from `@discord.ts/core`: `@RequireGuild()`, `@RequireOwner()`, `@RequirePermissions(...)`, `@RequireBotPermissions(...)`, `@RequireVoice()`, `@SameVoice()`, `@Cooldown(seconds)`. Each replies ephemeral and blocks the handler.

A custom guard is a `CanActivate` class — `{ canActivate(context) }` returning a boolean or a promise of one — applied with `@UseGuards()`. Guards resolve through the provider registry on first use, so a guard class can take constructor arguments through `@Inject()`. A preconfigured **instance** is used as-is, which is how a guard carries per-call arguments.

Class metadata is evaluated before method metadata, and the first `false` wins. A guard that denies is responsible for its own reply.

## Wiring

Add the provider to the **root** module's `providers`. Modules are flat: nested modules' providers are not read, so a command in a nested module never routes.

Built-in tokens always resolve: `DISCORD_CLIENT`, `DISCORD_DISCOVERY`, `DISCORD_MODULE_OPTIONS`, `DISCORD_OWNERS`. App tokens come from the registry — the registry constructs each provider once, in declaration order, and fails on duplicate tokens, missing tokens, and cycles.

## Registration

Sync is a full `PUT` that overwrites every command — there is no diff endpoint. It runs automatically on bootstrap unless `skipRegistration` is set. `deployWithModule(AppModule)` (or `bun run deploy`) syncs without logging in.

Guild commands are available immediately. Global commands propagate by read-repair with no published latency, so develop against a dev guild. A full `PUT` counts as a create for every command that does not already exist, against a 200-per-day-per-guild cap.

## What boot prints

Order is `init()` → validate → `logRoutes()` → login.

Validation throws a plain `Error` starting `[discord.ts] invalid command definitions:` with one bullet per problem, **before** any REST call. So a validation failure means you get no route table at all — a missing route table is a validation failure until proven otherwise.

When it passes, `logRoutes()` prints one line per resolved leaf:

```
Slash /ping -> PingCommand.handle
Menu User Info -> UserInfoCommand.handle
Event ClientReady -> ReadyListener.ready
Discovered 5 slash, 1 menus, 2 buttons, 0 selects, 1 modals, 1 events
```

Buttons, selects, and modals appear **only in the summary count** — there is no per-component line. A component handler that never fires produces no log difference at all; the count going up is the only boot-time evidence it was found. Route logging is therefore a valid completion check for commands, menus, and events, and a weak one for components.
