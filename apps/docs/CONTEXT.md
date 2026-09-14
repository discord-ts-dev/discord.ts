# CONTEXT.md — docs

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Docs app**: the Fumadocs site in `apps/docs`. Separate Next.js app, own deploy.
- **Content**: MDX pages under `content/docs`. Folder path sets URL.
- **Meta**: `meta.json` order for pages and folders. Listed items only.
- **Site meta**: name and links in `lib/layout.shared.tsx`, GitHub info in `lib/shared.ts`.
- **Deploy run**: docs ships as its own project. Route stays `/docs`.
