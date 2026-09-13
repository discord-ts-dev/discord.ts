# Codemods

Syntax upgrades on refactor. Dry-run by default, write with `--write`.

```bash
# preview rename across packages
bun run codemod rename-identifier packages --from OldName --to NewName
# apply it
bun run codemod rename-identifier packages --write --from OldName --to NewName
```

Add a codemod as `scripts/codemods/<name>.ts` exporting
`transform(source, path, args) => string | null`.
Keep regex transforms; reach for the TS compiler API only when regex is wrong.
