# @discord.ts/i18n

## 0.2.0

### Minor Changes

- d23bb48: Add native i18n in the dedicated `@discord.ts/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`

### Patch Changes

- 9f0dea9: Declare `exports` maps so deep subpaths stop being implicitly public. The CLI runner is now importable: `main(argv, deps)`, `COMMANDS`, `usage()` and the `CliDeps` injection point are exported, and `main` only runs when the file is the entry point - tests no longer spawn processes.
- Updated dependencies [d23bb48]
- Updated dependencies [d23bb48]
- Updated dependencies [f52c392]
- Updated dependencies [d23bb48]
- Updated dependencies [d23bb48]
- Updated dependencies [b3d03b2]
- Updated dependencies [e95d73e]
- Updated dependencies [76feef4]
- Updated dependencies [9f0dea9]
- Updated dependencies [67f87b6]
  - @discord.ts/common@1.0.0
