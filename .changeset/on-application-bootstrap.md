---
'@discord-ts-dev/core': minor
'@discord-ts-dev/common': minor
---

Add `onApplicationBootstrap` lifecycle hook.

Runs in `createRuntime` after discovery has scanned and routing has subscribed,
in construction order, so a provider may assume the bot shape exists. Duck-typed
like the existing hooks — no decorator, no base class — and failures aggregate
rather than stranding the rest. Runs in both boot and `deployWithModule` paths,
so hooks must be deploy-safe.
