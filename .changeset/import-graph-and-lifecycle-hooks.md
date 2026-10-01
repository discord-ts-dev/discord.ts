---
'@discord-ts-dev/core': minor
'@discord-ts-dev/common': minor
---

Read `imports` for providers, and add lifecycle hooks.

`@Module()` accepted `imports` and ignored them — `resolveDiscordOptions` read
`meta.providers` off the root class and used `imports` only to find the
`DiscordModule` def. A module listed in `imports` therefore contributed nothing.
The failure was invisible to the toolchain: with a nested provider removed, `tsc`,
the build and every other test stayed green and the app died at login with
`missing provider for token X`.

- `imports` is now walked depth-first and each module's `providers` are collected
  after the ones it imports, so a consumer is constructed after what it injects.
  A module is visited once, which makes diamonds and cycles terminate.
  `forRoot` defs, `null` and non-classes are skipped.
- Lifecycle hooks, duck-typed with no decorator and no base class: `onModuleInit`
  after construction in construction order; `onModuleDestroy` then
  `onApplicationShutdown` on SIGINT/SIGTERM in reverse construction order, with
  the client still connected. `bootstrapApp` and `deployWithModule` both run the
  shutdown half.
- A hook that throws does not skip the others. Failures are reported together,
  and a failing shutdown hook is logged before the client is still stopped, so a
  provider bug cannot strand a websocket open.
- `ProviderRegistry.onModuleInit()`, `.shutdown()` and `.initialized` are public;
  `collectModuleProviders()` is exported.

Non-breaking: a module with no `imports` collects exactly what it declared, and
no provider has hooks until one is added. There is still no `exports`,
`useFactory` or `useClass` — the registry is deliberately one flat set of single
instances, and there is no second consumer for encapsulation.

See docs/adr/0015-import-graph-and-lifecycle-hooks.md.
