---
'@discord.ts/common': minor
'@discord.ts/core': minor
'@discord.ts/systems': minor
---

Add real constructor injection. `@Inject(token)` records the token a
constructor parameter resolves from, and `createRuntime` builds providers —
classes and `{ provide, useValue }` values — through a `ProviderRegistry` that
constructs each provider once, resolves dependencies in declaration order, and
fails on duplicates, missing tokens, and cycles. Guards named in
`@UseGuards()` resolve through the same registry, so app guards inject
providers instead of defaulting to module singletons. `@discord.ts/systems`
exports the `STORE` token for apps plugging their Store adapter (ADR 0004).
Modules stay flat: only the root module's providers are read.
