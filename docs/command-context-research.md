# Research: unified CommandContext for discord.ts

Scope (agreed): full inventory, music-bot rows marked ★. Prior art: discordx + Sapphire; discord.js guides reference only. Backward compat: raw-union handlers work with zero edits. `wont-unify` list allowed; zero-loss means no silent loss.

Terms: **slash surface** (`ChatInputCommandInteraction`), **prefix surface** (`Message`), **CommandContext** (wrapper noun), **raw handler** (old union param), **unified handler** (new wrapper param).

## (a) Inventory tables

### A1. Slash surface → wrapper

discord.js v14 `ChatInputCommandInteraction`. ★ = touched by music-bot today.

| Raw capability | Wrapper member | Notes |
|---|---|---|
| `reply(string \| payload)` ★ | `reply()` — one reply | Branches on `replied/deferred` (see B2). Always resolves `Message`. |
| `deferReply({ephemeral})` ★ (seek/volume latency) | `defer(ephemeral?)` | Prefix: `channel.sendTyping()` best-effort no-op. |
| `deferred`, `replied` flags | `deferred`, `replied` getters | Read from interaction; prefix: `replied = lastMessage !== null`, `deferred = false`. |
| `editReply(payload)` (confirm/paginate path) | `editReply()` | Prefix: edits `lastMessage`. |
| `followUp(payload)` (replyEmbed second-call path) | `followUp()` | Prefix: plain `message.reply`. |
| `fetchReply()` | `fetchReply(): Promise<Message>` | Slash needs `fetchReply:true` first; wrapper hides that. |
| `deleteReply()` | `deleteReply()` | Prefix: deletes `lastMessage`. |
| `ephemeral: true` | accepted on `reply/defer/followUp`, **no-op on prefix** | Wont-lose: never throws; see B1. |
| `options.getString/getInteger/getNumber/getBoolean/getUser/getChannel/getRole/getMentionable/getAttachment`, `getSubcommand`, choices, `setAutocomplete` | **wont-unify — stays in `@Options()` DTO** | Structured vs free text cannot share one getter. `buildDto` vs `buildDtoFromArgs` unchanged. |
| `respond()` (autocomplete answer) | **wont-unify — separate `@Autocomplete()` handler** | Not a command reply; out of scope. |
| `user` ★ | `user` | One getter. |
| `member` (voice state carrier) ★ | `member`, plus `voiceChannelId`, `botVoiceChannelId` | Structural read, same as `VoiceGuard` today. |
| `guild` ★ | `guild`, `guildId` | `null` in DMs. |
| `channel` ★ | `channel`, `channelId` | Nullable channel. |
| `client` (ping uses `client.ws.ping`) ★ | `client` | One getter. |
| `createdTimestamp/createdAt` | `createdTimestamp` | One getter. |
| `memberPermissions/appPermissions` | **wont-unify — stays in guards** (`@RequirePermissions`, `@RequireBotPermissions`) | No handler reads these directly today. |
| `locale` | `locale` (nullable) + existing `@Locale()` | Falls back to guild locale via `resolveLocale`. |
| `commandName/commandId` | `commandName: string \| null` (null on prefix) | Debug only. |
| `showModal/awaitModalSubmit/awaitMessageComponent` | **wont-unify — via `unwrap()`** | Modal submits arrive as new `@Modal()` handlers. |
| Collector via `fetchReply().createMessageComponentCollector` (confirm/paginate) | covered by `reply()` returning `Message` | `confirm(ctx)`, `paginate(ctx)` accept `CommandContext` directly. |
| `channel.bulkDelete` (clear cmd) | **wont-unify — via `channel`** | Wrapper exposes `channel`, not a `bulkClear` method. Existing `bulkClear(channel,…)` helper unchanged. |

### A2. Prefix surface → wrapper

| Raw capability | Wrapper member | Notes |
|---|---|---|
| `content` (free text, `splitArgs` source) ★ | `content: string \| null` (null on slash) | Structured reads stay in DTO; raw text only for echo-style handlers. |
| `author` ★ | `user` (same object) | One `user`. `modId()`/`resolveAuthor` collapse today. |
| `member` ★ | `member`, `voiceChannelId` | Same as slash row. |
| `guild` ★ | `guild`, `guildId` | Same as slash row. |
| `channel` ★ | `channel`, `channelId` | Same as slash row. |
| `mentions` (users/roles/channels) | **wont-unify — stays in DTO via `parseMentionId`/`userIdOf`** | Slash equivalent is resolved `User`, not a mention graph. Unifying doubles the API. Use `unwrap()` for exotic cases. |
| `attachments` | **wont-unify — stays in DTO (`getAttachment` vs positional arg)** | Same reason as options. |
| `reference/messageReference`, `thread`, `url`, `stickers` | **wont-unify — via `unwrap()`** | No slash equivalent. No handler uses them today. |
| `reactions` / `react()` | `react(emoji)` only | Thin: prefix `message.react`; slash `fetchReply().react`. Keep because one line. Drop if review objects. |
| `reply()` quoting (message_reference, no double-reply rule) | `reply()` | Quotes on prefix; interaction reply on slash. The branch is the whole point. |
| `createdTimestamp/editedTimestamp` | `createdTimestamp` only | `editedTimestamp` wont-unify (no slash equivalent, unused). |
| `client` | `client` | One getter. |
| `channel.send/sendTyping` | `defer()` covers `sendTyping`; else via `channel` | No separate `send()`; `reply()` is the one path. |
| `createMessageComponentCollector/awaitMessageComponent` | covered by returned `Message` | Same as slash row. |

## (b) Mismatch resolutions

- **B1 ephemeral.** Interactions-only. Wrapper accepts `ephemeral` everywhere, applies on slash, ignores on prefix (`// ponytail: ephemeral has no prefix meaning, drop it rather than fail`). Matches current `replyEmbed` behavior.
- **B2 double-reply.** Interaction throws on second `reply()`; message does not. `reply()` branches: prefix → `message.reply`; slash + `!replied && !deferred` → `interaction.reply({fetchReply:true,…})`; slash + already-replied → `followUp()`. `editReply()` branches: slash → `interaction.editReply`; prefix → `lastMessage.edit` (fallback: fresh `reply` if nothing sent yet). This is the `replyEmbed`/`confirm`/`paginate` `isMessage` check moved inside one class.
- **B3 deferred.** `defer()` on slash → `deferReply()`; on prefix → `channel.sendTyping()` best-effort, never throws. `deferred` getter false on prefix so later `reply()` takes the normal path.
- **B4 option parsing.** No unification at the wrapper layer. Slash keeps `buildDto` (getters), prefix keeps `buildDtoFromArgs` (positional + trailing-string-join + `parseMentionId`). Handler reads the DTO either way. Wrapper exposes no `options` object — that would be the `replyX`-per-surface failure repeated.
- **B5 `fetchReply` shapes.** Slash returns `Message` only with `fetchReply:true`; `message.reply` always returns `Message`. Wrapper `reply()` always passes `fetchReply:true` on slash and always resolves `Message`, so `confirm`/`paginate` collectors work unchanged.
- **B6 component/modal chaining.** Post-reply buttons are *new* interactions routed to `@Button()`/`@Modal()` handlers, not continuations of the same context. Out of scope for the wrapper. `unwrap()` covers `showModal` and other slash-only calls.

## (c) Proposed `CommandContext` sketch

Lives in `@discord.ts/common` (types-only + discord.js types, no core import, no DI). Injection keeps index-list metadata: `buildArgs` wraps only when `design:paramtypes[i] === CommandContext`, else passes the raw object untouched.

```ts
import type { Client, Guild, GuildMember, Message, User } from 'discord.js';
// ponytail: structural wrapper, no DI. Raw union keeps working; this is opt-in per param type.
export type CommandSource = import('discord.js').ChatInputCommandInteraction | Message;
export type ReplyInput = string | { content?: string; embeds?: unknown[]; components?: unknown[]; ephemeral?: boolean };

export class CommandContext {
  private lastMessage: Message | null = null; // ponytail: single sent-message slot, editReply needs it on prefix
  constructor(private readonly source: CommandSource) {}
  get kind(): 'slash' | 'prefix' { return 'author' in this.source ? 'prefix' : 'slash'; }
  get isSlash(): boolean { return this.kind === 'slash'; }
  get user(): User { return 'author' in this.source ? this.source.author : this.source.user; }
  get member(): GuildMember | null { return this.source.member as GuildMember | null; }
  get guild(): Guild | null { return (this.source.guild as Guild | null) ?? null; }
  get channel(): CommandSource['channel'] { return this.source.channel; }
  get channelId(): string { return this.source.channelId; }
  get client(): CommandSource['client'] { return this.source.client; }
  get createdTimestamp(): number { return this.source.createdTimestamp; }
  get voiceChannelId(): string | null { return this.member?.voice?.channelId ?? null; }
  get replied(): boolean { return 'author' in this.source ? this.lastMessage !== null : (this.source.replied || this.source.deferred); }
  async reply(input: ReplyInput): Promise<Message> { /* B2 branch; sets lastMessage; ephemeral dropped on prefix */ throw new Error('sketch'); }
  async defer(ephemeral?: boolean): Promise<void> { /* B3 */ }
  async editReply(input: ReplyInput): Promise<Message> { /* B2 */ throw new Error('sketch'); }
  async followUp(input: ReplyInput): Promise<Message> { throw new Error('sketch'); }
  unwrap(): CommandSource { return this.source; } // escape hatch for wont-unify rows
}
```

`buildArgs` change (one branch, index lists unchanged):

```ts
for (const i of ctxIdx) args[i] = types[i] === CommandContext ? new CommandContext(interaction as CommandSource) : interaction;
```

Guards/`DiscordExecutionContext` keep receiving the raw source (voice/guild guards already read structurally). `ux` `confirm`/`paginate` widen their target union to `CommandContext | <current targets>` by delegating to `ctx.reply()`.

## (d) Edge cases

- **DMs:** `guild/guildId null`, `member null`, `voiceChannelId null`. `@RequireGuild()` blocks before handler, same as today. `user/channel/client` still work.
- **Deferred:** `defer()` then `reply()` → slash takes `followUp`/`editReply` path via `replied/deferred`; prefix ignores defer, `reply()` normal. Validation-failure `replyError` path must read `ctx.replied` (now unified) instead of raw flags.
- **Already-replied:** second `reply()` never throws: slash → `followUp`, prefix → fresh `reply`. Use `editReply()` when the intent is to mutate (pagers, confirm dialogs).
- **Component follow-ups:** button/select submits are separate handler calls with their own interaction, never the same `CommandContext`. Shared state (e.g. search picks) stays in services keyed by user, as today.
- **Ephemeral on prefix:** silently dropped. Document once; do not log per call.
- **Bot own messages / missing intent:** routing unchanged — `author.bot` ignored, prefix needs `MessageContent` intent. Wrapper adds no new gateway dependency.
- **`clear` channel guard:** `'bulkDelete' in channel` check stays in handler; wrapper does not hide channel capability differences.

## (e) Migration order

Count: ~40 unified `@Command` handlers (music 14, hud 5, filters 11, playlist 7, admin 7 incl. scope subs, info 3, example moderation 8 + ping/quest/echo/roll). Order by blast radius, smallest first:

1. **Core:** add `CommandContext` to `common`, wrap branch in `buildArgs`, unit-test branch (raw union untouched, wrapper wraps, `reply` branches on fake sources). No handler changes.
2. **ux:** widen `confirm`/`paginate`/`pickOne` to accept `CommandContext`. Moderation `ban`/`clear` are the only callers — behavior unchanged.
3. **Helpers:** `moderation.helpers.replyEmbed/replyError/modId/guildOf` and `music-helpers.voiceChannelIdOf` delegate to `CommandContext` getters (keep signatures, add overload). Keeps diffs one line per call site later.
4. **Example pilot:** `ping` → `quest` → `moderation` (warn, logs, clear exercise every branch: plain reply, pager, confirm, bulk guard). Proves DMs/deferred/already-replied paths.
5. **music-bot:** `info` (help/ping/premium) → `music` (join/leave/play/queue exercise voice + paginate) → `hud` → `playlist` → `filters` → `admin` last (owner guards + eval).
6. **Docs:** glossary terms (`slash surface`, `prefix surface`, `CommandContext`, `raw handler`, `unified handler`) into `packages/common/CONTEXT.md` + `packages/core/CONTEXT.md`; ADR only if wrapper placement (common vs core) surprises — else skip per three-rule test.

Rollback: per-handler revert is one type change (`CommandContext` → `Ctx` union); core branch is additive, safe to ship dark.
