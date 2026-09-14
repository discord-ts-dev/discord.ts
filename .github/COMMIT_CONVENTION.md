# Commit Convention

Adapted from [Angular's commit convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular).
Enforced on PR titles by Semantic PR.

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `types`.
Scope: package or area (`common`, `core`, `ux`, `cli`, `example`).
Breaking changes: append `!` (`feat(core)!: drop node 18`).

Examples:

```
feat(core): add guard composition
fix(cli): read shard count from config
```
