---
'@discord.ts/cli': minor
'@discord.ts/core': patch
---

Run on Bun instead of Node.js. The CLI spawns the runtime it is already running under (`process.execPath`) rather than `node` for build output, uses `Bun.spawnSync` / `Bun.file` / `Bun.stdout`, and its shebang is `#!/usr/bin/env bun` - the `discord` bin needs Bun now. Core reads config files via `Bun.pathToFileURL` and paints route logs with `Bun.color`. Node APIs with no Bun equivalent stay: `node:path`, `node:fs` `realpathSync`/`existsSync`, `node:vm` in the music-bot eval command, and `node:assert` in tests.
