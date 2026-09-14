---
'@discord.ts/common': major
'@discord.ts/core': major
'@discord.ts/ux': major
'@discord.ts/cli': major
---

Drop `@nestjs/*` for a standalone runtime and move to ESM (`NodeNext`, `type: module`). `Injectable`, `Module`, `SetMetadata`, `UseGuards`, `UsePipes`, `Logger` now come from `@discord.ts/common`; update example imports accordingly
