# CONTEXT.md — discord.ts

Ubiquitous language. Glossary only. No implementation.

## Terms

- **Package**: one published artifact under the `@discord.ts` scope. Eight exist;
  the `apps/*` workspaces are not packages.
  _Avoid_: workspace, app
- **Versioning**: the step that gives a changed package its next version number.
  It never makes that package available to anyone.
  _Avoid_: publish, release
- **Version PR**: the pull request carrying one versioning run. Merging it is the
  human decision to proceed past that point.
  _Avoid_: release PR, bump PR
- **Publish**: making an already-versioned package available on the registry. The
  version is fixed by the time this happens, so publishing decides nothing about
  it.
  _Avoid_: release, version, deploy
- **Release**: the whole path from a change to a published package. The word
  names that path, never one step inside it.
  _Avoid_: —
- **Publish gate**: the switch deciding whether a run is allowed to reach the
  registry. While it is closed, versioning still happens and nothing is
  published.
  _Avoid_: feature flag, dry run
