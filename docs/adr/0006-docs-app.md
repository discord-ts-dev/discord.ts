# ADR 0006 — Docs as separate Fumadocs app

Date: 2026-09-14

## Context

Feature docs lived in `README.md` and `docs/*.md` with no site, search, or versioned nav.
Fumadocs UI ships global styles and its own layouts, so mixing it into another app
risks style conflicts and coupled deploys.

## Decision

- Docs live in `apps/docs` as their own workspace package, scaffolded from
  `+next+fuma-docs-mdx` with `--src --linter oxlint --search orama --pm bun`.
- Content is MDX under `content/docs` (folder sets URL), ordered by `meta.json`.
  Route stays `/docs` so a subdomain or a `/docs/*` proxy both work.
- Deploy is a separate project (Vercel). No docs workflow yet; CI covers
  `build`/`typecheck`/`lint` via turbo, with `.next/**` in build outputs.

## Consequences

- `bun run build` includes the docs app; `turbo` caches `.next/**`.
- Docs package exposes both `types:check` (scaffold default) and `typecheck`
  (turbo task name) running the same command.

## Skipped

- Static export template (host gives us a server; revisit for CDN-only hosting).
- AI chat and OG customization (defaults suffice until docs traffic says otherwise).
- Docs deploy workflow (added when the host project exists).
