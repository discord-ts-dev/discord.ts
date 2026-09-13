# Contributing

Quick path: `bun install`, `bun run build`, `bun run test`.

- Branch from `main`. One PR per change. Keep PR titles conventional (`feat:`, `fix:`, `chore:`).
- Touch `packages/*`? Add a changeset: `bunx changeset`, pick bump, describe it.
- Run before push: `bun run lint`, `bun run typecheck`, `bun run format:check`, `bun run test`, `bun run scripts:check`.
- Lint autofix available on PRs: comment `/autofix`.
- Syntax renames go through `scripts/codemods` (dry-run first, see its README).
- Report bugs with a repro bot snippet. Small PRs merge faster than big ones.
