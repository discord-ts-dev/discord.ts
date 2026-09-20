---
'@discord.ts/systems': patch
---

Pin `incrBy` to integer semantics: increments truncate toward zero (Redis
`INCRBY` behavior) instead of storing fractional sums. Sorted-set ties now
order by member like Redis, and the port is pinned by a shared conformance
suite.
