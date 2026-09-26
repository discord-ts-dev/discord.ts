# discord.js → discord.ts

Traps for code arriving with discord.js habits. Read before writing a handler in this repo.

The framework is `@discord.ts/*` on discord.js v14. discord.js types, enums, and builders are still the objects you pass around — only the wiring changed.

| discord.js habit | Here |
| --- | --- |
| `client.on(Events.X, fn)` in a constructor | `@Injectable()` class with an `@OnEvent(Events.X)` method. `@Context()` receives `raw[0]`; remaining args pass through |
| `interaction.guild` / `.user` / `.locale` | `@Context()` for the raw interaction, or the `@Guild()` / `@Author()` / `@Locale()` param decorators |
| `new SlashCommandBuilder()` + `client.applicationCommands.register()` | `@Command({ name, description })` on a method. The provider registry builds the JSON from decorator metadata; sync is a full `PUT` on bootstrap |
| `builder.setDefaultMemberPermissions()` / `.setDMPermission()` / `.setNSFW()` | flat fields on `@Command()`: `defaultMemberPermissions`, `dmPermission`, `nsfw`, `contexts` — top-level only, Discord reads them only there |
| prefix commands, `content.startsWith(prefix)` | gone (ADR-0008). One decorator, slash only, raw `ChatInputCommandInteraction` via `@Context()` |
| `PermissionsBitField` | `PermissionFlagsBits` for flags, `@RequirePermissions(PermissionFlagsBits.X)` for guards |
| `ephemeral: true` | still typechecks and is `@deprecated` — your build will not catch it. `flags: MessageFlags.Ephemeral` is the current form; `packages/ux/src/reply.ts:62` already uses it |
| `interaction.reply({ content, ephemeral })` and hand-rolled edit/follow-up branching | `deliver()` from `@discord.ts/ux` picks reply vs edit vs followUp from the target's state, and never throws — see `references/state.md` |
| a `Collection` filter-and-await prompt | `@discord.ts/ux`: `confirm`, `paginate`, `pickOne`, author lock |
| `catch (e) { console.error(e) }` around a REST call | wrap only the call you expect to fail and reply with the `errorEmbed` style. The framework already catches and logs everything else — see silent failure in `SKILL.md` |
| `new Client({ intents })` + `login(token)` | `defineConfig()` in `discord.config.ts` + `bootstrapApp(AppModule)`; `deployWithModule(AppModule)` to deploy without logging in |
| `@discordjs/builders` for command JSON | not needed; the registry derives it from decorators |
| `import type { X } from './y.js'` everywhere | fine for discord.js types, **not** for an options DTO — it must be a value import (`references/commands.md`) |

## Two enums, both with a 2

`ApplicationCommandType` — `ChatInput 1`, `User 2`, `Message 3`, `PrimaryEntryPoint 4`. It has no `ApplicationCommand` member.

`InteractionType` — `Ping 1`, `ApplicationCommand 2`, `MessageComponent 3`, `ApplicationCommandAutocomplete 4`, `ModalSubmit 5`.

## Errors you will look for and not find

- There is no `MissingPermissions` class in discord.js 14.27. The platform error is HTTP 403 with JSON code `50013`.
- Bulk delete of a too-old message is a separate code, `50034`.
- `30001` "Maximum number of guilds reached (100)" is the **user account** limit, not a bot limit.

## Where the truth lives

- **API surface**: the installed typings — `discord.js` and `@discord.ts/*` under `node_modules` (a bun install resolves them through `node_modules/.bun/`). Faster and more current than any guide.
- **Framework surface**: `apps/docs/content/docs/` — one page per feature.
- **Why it is like this**: `docs/adr/`. The anti-fix list in `references/ops.md` is the short version.
- **Vocabulary**: `CONTEXT-MAP.md` → the context's `CONTEXT.md`. Use its words for domain concepts.
