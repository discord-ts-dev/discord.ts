---
'@discord.ts/systems': minor
---

Bundle the `FileStore` reference adapter (ADR 0004 amendment via ADR 0009
port exception). `new FileStore(file)` keeps state in memory with lazy TTL
and syncs the whole JSON file (`file.tmp` + rename) per write — single
process only, no options object. Pin integer `incrBy` (truncate toward zero,
Redis `INCRBY`); `MemoryStore` is patched to match. owo adopts the framework
adapter with the same `OWO_DATA_FILE` default.
