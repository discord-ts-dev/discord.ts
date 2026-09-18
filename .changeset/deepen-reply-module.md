---
'@discord.ts/ux': minor
'@discord.ts/core': patch
---

Deepen the reply module. `replyEphemeral()` and the new `replyEmbed()` now share
one delivery path, `deliver()`: it replies when the interaction is free, edits
when it is already acknowledged, and follows up when a private reply is wanted
after acknowledgement. An acknowledged Context no longer silently drops the
message, so `confirm()` followed by a result reply works instead of throwing.
`confirm()`, `paginate()`, and `pickOne()` send through the same path and use
the current `withResponse` API; the example, music-bot, and owo apps adopt it.
