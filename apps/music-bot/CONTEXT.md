# CONTEXT.md — music-bot

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Music bot**: the runnable app in `apps/music-bot`. Wires `common` decorators into the `core` module, 100% port of Shiroko command inventory.
- **Track**: one playable URI plus name, duration, encode. Requested by a user. Not `Song`.
- **Queue**: per-guild ordered `Track` list plus current, paused, volume, loop, autoplay, filters. Not `Playlist`.
- **Guild player**: Lavalink player per guild. One voice connection max. Owns transport for its `Queue`.
- **Playlist**: saved named `Track` list per `User`. Load copies into `Queue`. Steal copies from another `User`.
- **Filter**: Lavalink audio effect per guild player (`bassboost`, `nightcore`, `karaoke`, `8d`, `pitch`, `speed`, `tremolo`, `vibrato`, `lowpass`, `rotation`). Reset clears all.
- **Premium**: per-`User` or per-guild flag gating track and playlist limits.
- **Non-premium cap**: 25 queued tracks per guild without premium. Premium lifts it.
- **Search pick**: select-menu choice from `search` results. Stored per user, expires on next search.
- **Control row**: button row on `nowplaying` (resume, skip, stop, loop, shuffle). Framework-routed, no per-message collector.
- **Deploy run**: `bun run deploy` in this app. Syncs slash JSON without login.
