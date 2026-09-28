---
'@discord-ts-dev/common': patch
---

Load signale through `createRequire` instead of a named ESM import. Under Node
ESM, importing `@discord-ts-dev/common` threw `SyntaxError: The requested module
'signale' does not provide an export named 'Signale'` at import time, because
signale is CommonJS and exports via `Object.assign`, which Node's
`cjs-module-lexer` cannot analyse. Since `common` is the root of every other
package, nothing that imported the framework worked under Node. Bun was
unaffected, so no test in the repo caught it.

See docs/adr/0014-signale-cjs-named-import.md.
