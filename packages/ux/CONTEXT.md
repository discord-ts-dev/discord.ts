# CONTEXT.md — ux

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Reply**: delivery of a message on a Context. `deliver()` replies when the Context is free, edits when it is already acknowledged, and follows up when a private reply is wanted after acknowledgement. `replyEphemeral()` and `replyEmbed()` build on it and never throw.
- **Confirm**: a Yes/No button dialog on a repliable interaction. `confirm()` takes text or embeds. Returns true on accept, false on cancel or timeout.
- **Pager**: prev/next embed navigation on a repliable interaction. `paginate()` handles buttons until timeout.
- **Picker**: single-select menu on a repliable interaction. `pickOne()` resolves the picked value, null on timeout.
- **Author lock**: restriction of an interaction flow to a single initiating user. Non-authors get an ephemeral nudge and are ignored.
- **Error embed**: the single red failure style. Built via `errorEmbed()`.
