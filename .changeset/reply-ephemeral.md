---
"@discord.ts/ux": minor
"@discord.ts/core": patch
---

Add `replyEphemeral()`: best-effort ephemeral replies that skip when the
interaction was already answered and never throw. Core guards and the routing
error path now share it instead of carrying six copies of the same reply block.
