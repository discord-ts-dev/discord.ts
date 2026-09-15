---
'@discord.ts/core': patch
---

Internal only: the cooldown eviction test drives its 5001 guard checks through `Promise.all` so lint stays warning-free. No API or behaviour change.
