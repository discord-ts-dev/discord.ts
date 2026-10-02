# @discord-ts-dev/redis

## 0.2.2

### Patch Changes

- 4056165: Hold any Store key or member, including names that collide with a property of
  `Object.prototype`.

  `FileStore` resolved `__proto__`, `constructor`, and `prototype` against
  `Object.prototype` instead of treating them as stored names. A sorted-set
  member of that name scored as an object rather than a number, `get` on an
  unwritten `constructor` key returned the inherited constructor instead of
  `null`, `incrBy` over such a key started from zero rather than the stored
  value, and any of the three was dropped on flush because a re-parented write
  is never an own property — so a shop purchase could report success and store
  nothing. `shop`'s inventory map had the same shape on a caller-chosen item id.

  No production input reached these, so this is a latent-defect fix rather than a
  live vulnerability. The port now promises to tolerate any key and any member
  (ADR 0016), the shared conformance suite pins it across all three adapters, and
  `FileStore` holds such names in prototype-free maps. `inventory()` still
  returns an ordinary object, so app code is unaffected.

- Updated dependencies [4056165]
  - @discord-ts-dev/systems@0.4.2

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
