# CONTEXT.md — ux

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Confirm**: a Yes/No button dialog on an interaction or a prefix message. `confirm()` takes text or embeds. Returns true on accept, false on cancel or timeout.
- **Pager**: prev/next embed navigation on an interaction or a prefix message. `paginate()` handles buttons until timeout.
- **Picker**: single-select menu on an interaction or a prefix message. `pickOne()` resolves the picked value, null on timeout.
- **Error embed**: the single red failure style. Built via `errorEmbed()`.
