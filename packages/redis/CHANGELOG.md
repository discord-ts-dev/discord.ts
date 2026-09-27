# @discord-ts-dev/redis

## 0.2.1

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
  - @discord-ts-dev/systems@0.4.1

## 0.2.0

### Minor Changes

- 8850420: New `@discord-ts-dev/redis` package: `RedisStore` implements the `Store` port on
  Bun's native Redis client — including `update()` through WATCH/MULTI/EXEC
  retries, TTL-preserving writes, integer `incrBy`, and sorted sets — plus
  `redisProviders()` to register the store under `STORE` and the raw client
  under `REDIS` through the provider registry (ADR 0011).

### Patch Changes

- Updated dependencies [30313b2]
- Updated dependencies [033afd4]
- Updated dependencies [d7f67e4]
- Updated dependencies [1bc0112]
- Updated dependencies [d7f67e4]
- Updated dependencies [8850420]
  - @discord-ts-dev/systems@0.4.0
  - @discord-ts-dev/common@1.2.0
