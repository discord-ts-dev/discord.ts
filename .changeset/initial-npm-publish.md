---
'@discord-ts-dev/cli': patch
'@discord-ts-dev/common': patch
'@discord-ts-dev/core': patch
'@discord-ts-dev/i18n': patch
'@discord-ts-dev/redis': patch
'@discord-ts-dev/systems': patch
'@discord-ts-dev/utils': patch
'@discord-ts-dev/ux': patch
---

First publish to npm. Add `repository`, `bugs` and `homepage` metadata, and ship
`CHANGELOG.md` and `LICENSE` in the tarball. See ADR 0012.

Internal dependencies move from the `workspace:*` protocol to a caret range.
npm does not rewrite `workspace:` on pack or publish, so the protocol reached
the registry verbatim and every consumer install failed with
`EUNSUPPORTEDPROTOCOL`. Caret ranges are what `updateInternalDependencies`
already expects, and they resolve once the dependencies are published.
