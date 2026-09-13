#!/usr/bin/env bash
set -euo pipefail
# Bridges a bun gap: workspace packages' bins are not linked into
# dependents' node_modules/.bin, so `discord` would not resolve in
# apps/example scripts. Published consumers are unaffected (package
# managers link published bins normally). Skipped on CI (build only).
if [ -z "${CI:-}" ]; then
  chmod +x packages/cli/dist/cli.js 2>/dev/null || true # dist may not exist yet; build relinks
  mkdir -p apps/example/node_modules/.bin
  rm -f apps/example/node_modules/.bin/discord
  ln -s ../../../../packages/cli/dist/cli.js apps/example/node_modules/.bin/discord
fi
