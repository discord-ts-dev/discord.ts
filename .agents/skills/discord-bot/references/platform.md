# Platform

Constraint → the code shape it forces. Verified 2026-09-26 against discord.js 14.27.0 and Discord's developer docs.

Discord's docs move — four limits this file would once have stated are already gone from them (last section). When a command's behaviour contradicts this file, the behaviour is the truth: fix the file, and re-verify the whole table at a discord.js major.

## Interactions

| Constraint | What it forces |
| --- | --- |
| First response within **3 seconds** of receiving the event, or the token is invalidated | Anything that crosses the network before the first reply happens *after* `deferReply`. Decide this while writing the handler, not after it hangs |
| Token valid **15 minutes** after issue | A slow job is `deferReply` → work → `editReply`, with the user watching a spinner. Anything later is `followUp` |
| Interaction endpoints are **exempt from the 50/s global limit** | Don't reason about a burst of replies with the global number. Reason with the response headers: parse `X-RateLimit-*` and `Retry-After`. Official guidance is to parse headers, not to hardcode limits |
| 10,000 invalid requests per 10 minutes before a Cloudflare ban; 401/403/429 all count | A retry loop on a 403 is how a bot gets disconnected. Retry on 429 and 5xx only |
| `40060` already acknowledged, `40094` maximum follow-ups hit | You replied twice. One interaction, one reply |

## Ephemeral and mentions

`flags: MessageFlags.Ephemeral` (64) is the current form. `ephemeral: true` is `@deprecated` and still typechecks, so nothing catches it for you.

Ephemeral for validation failures, guard denials, and errors — the user needs to read it once. Public for anything they must keep, act on later, or that other people should see: confirmations, results, leaderboards.

Set `allowedMentions` on any reply that echoes user input. Without it a user who types `@everyone` into a string option makes the bot ping the server.

## Messages and embeds

| Limit | Value |
| --- | --- |
| Content | 2000 |
| Embeds per message | 10 |
| Embed description | 4096 |
| **All embed text combined, across every embed on the message** | **6000** |
| Title / author name | 256 |
| Field name / field value | 256 / 1024 |
| Fields per embed | 25 |
| Footer text | 2048 |

The 6000 total is shared across all embeds on one message, not per embed — a split embed that passes per-embed checks still gets rejected. Embeds sharing a URL: only the first is shown.

Also 10 attachments per message, 250 pins, and message edits are capped past an hour.

## Components and modals

| Limit | Value |
| --- | --- |
| Action rows (legacy messages) | 5 |
| Per action row | 5 buttons, or 1 select |
| Button label | 80 |
| `customId` | 1–100, unique per message |
| Button `url` | 512 |
| Select placeholder | 150 |
| Select options | 25 |
| Select option label / value / description | 100 each |
| Modal title | 45 |
| Modal components | 1–5 |
| Text input value | 4000 |
| Autocomplete choices | 25 |

Components V2 allows 40 total components and is flagged `1 << 15` (32768) — once a message carries that flag it cannot be removed, and it disables `content`, `embeds`, `poll`, and `stickers`.

`customId` is the only thing that routes a component back to your handler. Encode the identity you need in it: `/warn:confirm:<userId>`. An id that identifies only the action lets one user's click act on another's row.

## Moderation

A bot can only kick, ban, and edit nicknames for users whose **highest** role is **lower** than the bot's own highest. Highest means greatest position; `@everyone` is 0; the guild owner is exempt. The same ordering governs granting and editing roles.

- `GuildMember#manageable` is the library's check: ownership plus role position, never permissions.
- `kickable` / `bannable` = `manageable` **and** the matching permission.
- Failure is HTTP 403 / JSON `50013`.
- `Administrator` bypasses permissions and channel permission overwrites, and a member with it can use every command. It does **not** bypass the role hierarchy: an admin's bot still cannot act above its own highest role.
- A member who lacks a command's permission does not see it in the picker.
- Where the guild enforces 2FA, the **owner account** needs 2FA for the permissions marked `*` — including Kick Members, Ban Members, Manage Messages, Manage Roles, Moderate Members.

## Gateway and intents

Privileged intents are exactly three: `GuildMembers`, `GuildPresences`, `MessageContent`. Each needs the Developer Portal toggle; an app with more than 10,000 unique users needs review before approval.

Close codes `4013` (invalid intent) and `4014` (disallowed intent) do not reconnect. A bot that worked yesterday and logs in to nothing today, right after a deploy or a portal change, is almost always `4014`.

Without `MessageContent`, `content` arrives empty — except in the bot's own messages, its DMs, messages where it is mentioned, and the message a message-context-menu command was used on. A "the bot sees nothing" report is this intent before anything else.

Gateway outbound: 120 events per 60 seconds per connection, 4096 bytes per payload. Don't fan state out at startup.

Sharding: 2500 guilds per shard, and 2500+ guilds requires sharding (close code `4011`). There is no absolute guild cap for bots.

## Commands

100 `CHAT_INPUT`, 15 `USER`, 15 `MESSAGE`, 1 `PRIMARY_ENTRY_POINT` globally, and the same per guild. 200 command creates per day per guild. Names 1–32, descriptions 1–100, 25 options, 25 choices per option, required options before optional ones, one level of subcommand nesting. `USER` and `MESSAGE` commands take an empty description.

Beyond that there is an 8000-character budget for the combined name, description, and value of a command, its options, and its choices.

Registration is a full overwrite, never a diff. Guild commands are available immediately; global commands propagate by read-repair with no published latency — so verify in a dev guild, and treat a global command as eventually visible.

## Bulk delete

2 to 100 message ids. Nothing older than **14 days** — the library exports `MaxBulkDeletableMessageAge` (1,209,600,000 ms) and filters on it. Ids that do not exist still count toward the minimum. Guild channels only, needs `ManageMessages`. Filter by timestamp before calling; a single too-old id fails the whole request with `50034`.

## Four numbers that are not in the docs

Do not repeat these; they circulate from older guides.

- **100 total choices per command** — replaced by the 8000-character budget above.
- **25 total components** — 5 action rows on legacy messages, 40 under Components V2.
- **Global command propagation time** — guild commands are immediate, global commands are read-repair with no stated duration.
- **2000ms / 3000ms interaction rate-limit buckets** — no per-endpoint table is published. Parse the headers.
