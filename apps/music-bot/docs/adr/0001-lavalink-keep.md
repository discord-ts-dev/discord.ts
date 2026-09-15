# ADR-0001: Keep Lavalink for music transport

Date: 2026-09-14. Status: accepted. Context: `apps/music-bot`.

## Decision

Keep external Java Lavalink server with `lavalink-client` for playback, same as Shiroko source. `MusicService` holds queue state; transport calls plug into per-guild player.

## Alternatives

- `@discordjs/voice` direct: no extra server, simpler. Rejected for v1 because 100% parity needs YouTube, Spotify, Apple Music, SoundCloud sources Shiroko already gets via Lavalink.
- Full rewrite of sources per-provider: most work, most bans. Rejected.

## Consequences

- Dev needs `LAVALINK_SERVER_HOST`, `LAVALINK_SERVER_PORT`, `LAVALINK_SERVER_PASSWORD` plus `application.yaml` from source.
- `apps/music-bot` ships no Java; Docker composes bot plus Lavalink separately.
- Revisit if Lavalink ops cost exceeds benefit; seam is `MusicService`.
