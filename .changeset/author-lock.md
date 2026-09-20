---
'@discord.ts/ux': minor
---

Author lock for interactions. `confirm()` and `paginate()` accept `{ timeoutMs?, allowedUserId? }` alongside the existing number form; non-authors get an ephemeral nudge and are ignored. New `authorLock(resolveUserId, { deny? })` guard factory for component handlers with fail-open on unknown initiator. owo adopts `allowedUserId` on marriage/reset confirms and dex/zoo pagers, and `authorLock` on blackjack buttons.
