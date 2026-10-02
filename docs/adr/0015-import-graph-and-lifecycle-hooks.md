# ADR 0015 — Import graph and lifecycle hooks

Date: 2026-10-01

Status: accepted

Supersedes nothing. Amends the DI surface described in `apps/docs/content/docs/core/module.mdx`.

## Context

`@Module()` accepted `imports` and did nothing with them. `resolveDiscordOptions` read
`meta.providers` off the root class and used `imports` for one purpose only: finding the
`DiscordModule` def. A module listed in `imports` contributed nothing, and `@Module` had no
`exports` to offer.

The failure mode is the bad kind. Removing a nested provider from a real app (The Aris Bot)
left `tsc` green, the build green, and every other test green — the app only died at login
with `missing provider for token PrismaService`. Nothing in the toolchain can see a provider
that was never collected.

The second gap was self-inflicted. `apps/docs/content/docs/recipes/prisma.mdx` had to teach
users to call `prisma.$disconnect()` wherever their process handled shutdown, and to
hydrate caches from a `ClientReady` listener instead of a hook, because no lifecycle hook
existed. The docs were carrying a workaround for an absence.

## Decision

**`imports` collects providers.** Depth-first, a module's own providers after the ones it
imports, so a consumer is constructed after what it injects. A module is visited once, which
is what makes a diamond or a cycle terminate. `forRoot` defs, `null` and non-classes in
`imports` are skipped — a def is a config carrier, not a module.

**Lifecycle hooks.** `onModuleInit` after construction, in construction order.
`onModuleDestroy` then `onApplicationShutdown` on SIGINT/SIGTERM, in reverse construction
order, with the client still connected. `bootstrapApp` and `deployWithModule` both run the
shutdown half. A hook that throws does not skip the others; the failures are reported
together, and a failing shutdown hook is logged before the client is still stopped.

Hook names are duck-typed. No decorator, no base class, no import: an existing provider can
gain one without changing anything else about it.

## Why no `exports`

Enforcing `exports` needs a per-module container, not a flat map. This registry is
deliberately one flat set of single instances — correct for a single-process bot, and cheap
enough that discovery can scan every instance without bookkeeping.

There is no second consumer asking for encapsulation, and per ADR 0009's rule of two a
feature with one is a documented recipe, not a promotion. So `imports` collects everything
visible, and the answer to "I do not want this injectable" is to not import the module. The
`duplicate provider` failure is what stands in for scope errors.

`useFactory` and `useClass` are still absent, for the same reason and the same one consumer
count. The Prisma recipe documents the `@Injectable()` wrapper instead.

## Rule of two

ADR 0009 requires two independent consumers.

1. **An app.** The Aris Bot (`the-aris-bot`) — `PrismaModule` contributes `PrismaService`
   through `imports`, and the service's connect/disconnect become `onModuleInit` /
   `onModuleDestroy` instead of a rationale for why neither exists.
2. **The framework's own docs recipe.** `apps/docs/content/docs/recipes/prisma.mdx` told
   users to hand-wire `$disconnect()` and to hydrate from `ClientReady` because there was no
   hook. Two independent sites, and the second is the framework contradicting itself.

## Amendment 2026-10-02 — `onApplicationBootstrap`

`createRuntime` now runs `onApplicationBootstrap` after discovery has scanned
and routing has subscribed, in construction order, before returning the runtime.
It throws aggregated like `onModuleInit` and aborts boot before return. It runs
in both boot and `deployWithModule` paths with no skip flag, so hooks must be
deploy-safe. Duck-typed, no decorator, no base class — the same contract as the
trio. `beforeApplicationShutdown` / signal-arg shutdown / `enableShutdownHooks`
are still absent by agreement.

## `exports` and `useFactory`: searched for a second consumer, not found

ADR 0009's rule of two needs two consumers before either ships. I looked, on 2026-10-02, and
neither has one.

**`exports`.** Both apps that register providers declare a single flat module — `owo` has ~45
in one `providers` array, `music-bot` the same shape — so neither has a boundary to hide a
provider behind. The one consumer is The Aris Bot's `PrismaModule`, and it wants one provider
visible, which is what the default already gives. The register's own convention agrees: every
entry in *Considered, deferred* reopens on "a second app needs it".

**`useFactory`.** The closest candidate is a provider built from config that `forRootAsync`
loads asynchronously, because `useValue` is evaluated at decoration time — before config
exists. `owo` hits this today and works around it by reading `process.env` at module scope,
which is the smell. But the hook shipped in this ADR already solves it: build it in
`onModuleInit` instead. So the one candidate consumer is already served, and adding
`useFactory` would be a second way to do a solved thing.

Both are recorded in `docs/owo-capability-gaps.md` under *Considered, deferred*, with the
trigger that reopens each. That is where ADR 0009 puts a one-consumer candidate — a documented
recipe, not a promotion.

## Consequences


- A nested module works as written, and the failure it replaces surfaced at boot after every
  other gate had passed.
- `pnpm deploy` releases whatever a provider acquired at boot.
- Reverse-order teardown is the correct order: dependents go before dependencies.
- A provider that acquires in its constructor can move to `onModuleInit` without a caller
  change, and a bad `DATABASE_URL` stops killing the boot.
- The registry is unchanged as a data structure. `imports` is resolved before construction,
  in one function, so no per-provider scope bookkeeping appears anywhere.
- Existing apps are unaffected: a module with no `imports` collects exactly what it declared,
  and no provider has hooks until one is added.
