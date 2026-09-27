# @discord-ts-dev/i18n

## 0.3.2

### Patch Changes

- 96e1908: First publish to npm. Add `repository`, `bugs` and `homepage` metadata, and ship
  `CHANGELOG.md` and `LICENSE` in the tarball. See ADR 0012.

  Internal dependencies move from the `workspace:*` protocol to a caret range.
  npm does not rewrite `workspace:` on pack or publish, so the protocol reached
  the registry verbatim and every consumer install failed with
  `EUNSUPPORTEDPROTOCOL`. Caret ranges are what `updateInternalDependencies`
  already expects, and they resolve once the dependencies are published.

- Updated dependencies [96e1908]
  - @discord-ts-dev/common@1.2.1

## 0.3.1

### Patch Changes

- Updated dependencies [d7f67e4]
- Updated dependencies [1bc0112]
  - @discord-ts-dev/common@1.2.0

## 0.3.0

### Minor Changes

- 6dc5e6c: Slash-only command surface. Remove prefix commands, `@PrefixCommand` / `@PrefixArgs`, `@SlashCommand`, `CommandContext`, the `prefix` config option, `setPrefix()`, `isMessage()`, the prefix DTO fill path, and the per-guild prefix setting. Handlers take the raw interaction via `@Context()`. Add metadata localizations: command and option `name_localizations` / `description_localizations` fill from `commands:<name>...` catalog keys (Discord locale codes only, one boot warning for others), explicit `LocalizationMap` fields override per locale, and commands gain `dmPermission`. `lookup()` reads one locale without default fallback.

### Patch Changes

- Updated dependencies [6dc5e6c]
  - @discord-ts-dev/common@1.1.0

## 0.2.0

### Minor Changes

- d23bb48: Add native i18n in the dedicated `@discord-ts-dev/i18n` package: enable with `i18n` in discord.config.ts, catalogs in `src/locales/<lang>/<namespace>.json`, lookup via `t()`, per-call locale via `@Locale()`

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
  - @discord-ts-dev/common@1.0.0
