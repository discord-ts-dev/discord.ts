---
'@discord.ts/utils': minor
---

`weightedPick(items, random?)` draws a value with probability proportional to
its weight. Non-positive weights take no part; empty input or a total weight of
zero returns `undefined`, never throws. `random` is injectable so callers roll
deterministically. Paw adopts it in `pickRarity`, `spinSlot`, and `drawWinner`;
the three total-and-subtract loops are gone, `spinSlot` loses its unused
`symbols` parameter.
